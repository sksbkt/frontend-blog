/**
 * Gemini API Rate-Limit Queue & Exponential Backoff Shield
 *
 * Prevents HTTP 429 (RESOURCE_EXHAUSTED) & 503 (UNAVAILABLE) errors by:
 * 1. Pacing all Gemini requests through a concurrency & minimum-interval queue singleton.
 * 2. Automatic retry with exponential backoff & randomized jitter.
 * 3. Graceful fallback with clean 429 user-friendly messages when quota is saturated.
 */

export interface BackoffOptions {
  maxRetries?: number; // default: 2
  baseDelay?: number; // default: 800ms
  maxDelay?: number; // default: 6000ms
  jitterMax?: number; // default: 400ms
}

export class GeminiRateLimitError extends Error {
  status: number;
  constructor(
    message: string = "Gemini AI capacity is currently saturated. Please wait a moment and try again."
  ) {
    super(message);
    this.name = "GeminiRateLimitError";
    this.status = 429;
  }
}

/**
 * Detect transient 429, 503, RESOURCE_EXHAUSTED, or capacity spikes in errors
 */
export function isRateLimitOrCapacityError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof GeminiRateLimitError) return true;

  const msg = error instanceof Error ? error.message : String(error);
  // @ts-expect-error status on error object
  const status = error?.status || error?.statusCode || error?.statusText;

  if (status === 429 || status === 503 || status === "429" || status === "503") {
    return true;
  }

  const rateLimitPatterns = [
    /429/i,
    /503/i,
    /RESOURCE_EXHAUSTED/i,
    /UNAVAILABLE/i,
    /quota/i,
    /rate limit/i,
    /high demand/i,
    /temporarily unavailable/i,
    /spikes in demand/i,
    /overloaded/i,
  ];

  return rateLimitPatterns.some((pattern) => pattern.test(msg));
}

/**
 * Execute an async operation with exponential backoff and randomized jitter
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options?: BackoffOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 2;
  const baseDelay = options?.baseDelay ?? 800;
  const maxDelay = options?.maxDelay ?? 6000;
  const jitterMax = options?.jitterMax ?? 400;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // If this is the last attempt, non-transient, or a daily/hourly quota exhaustion, stop immediately
      const isDailyExhausted =
        err instanceof Error &&
        (/PerDay/i.test(err.message) ||
          /retry in \d+h/i.test(err.message) ||
          /GenerateRequestsPerDay/i.test(err.message));

      if (attempt > maxRetries || !isRateLimitOrCapacityError(err) || isDailyExhausted) {
        if (isDailyExhausted) {
          console.warn("[GeminiQueue] Daily quota exhausted for current model. Failing fast to fallback candidate...");
        }
        break;
      }

      // Calculate exponential backoff: baseDelay * 2^(attempt - 1) + jitter (0-800ms)
      const exponential = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * (jitterMax + 1));
      const delay = Math.min(maxDelay, exponential + jitter);

      console.warn(
        `[GeminiQueue] Transient rate-limit (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`,
        err instanceof Error ? err.message : String(err)
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (isRateLimitOrCapacityError(lastError)) {
    throw new GeminiRateLimitError();
  }

  throw lastError;
}

export interface QueueConfig {
  maxConcurrency?: number; // default: 2
  minIntervalMs?: number; // default: 2000ms
}

interface QueuedTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  backoffOptions?: BackoffOptions;
}

/**
 * Pacing queue that limits concurrency and enforces minimum dispatch spacing
 */
export class GeminiQueue {
  private maxConcurrency: number;
  private minIntervalMs: number;
  private activeCount: number = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: QueuedTask<any>[] = [];
  private lastDispatchTime: number = 0;
  private isProcessing: boolean = false;

  constructor(config?: QueueConfig) {
    this.maxConcurrency = config?.maxConcurrency ?? 2;
    this.minIntervalMs = config?.minIntervalMs ?? 2000;
  }

  /**
   * Run a task through the rate-limited queue with exponential backoff
   */
  public run<T>(
    fn: () => Promise<T>,
    backoffOptions?: BackoffOptions
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject,
        backoffOptions,
      });
      this.processNext();
    });
  }

  /**
   * Current queue statistics
   */
  public getStats(): { active: number; waiting: number } {
    return {
      active: this.activeCount,
      waiting: this.queue.length,
    };
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0 && this.activeCount < this.maxConcurrency) {
        // Enforce minimum interval spacing between consecutive dispatches
        const now = Date.now();
        const elapsed = now - this.lastDispatchTime;
        if (elapsed < this.minIntervalMs) {
          const waitTime = this.minIntervalMs - elapsed;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }

        if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
          break;
        }

        const task = this.queue.shift();
        if (!task) break;

        this.activeCount++;
        this.lastDispatchTime = Date.now();

        // Run task with exponential backoff without blocking the queue loop
        (async () => {
          try {
            const result = await withExponentialBackoff(
              task.fn,
              task.backoffOptions
            );
            task.resolve(result);
          } catch (err) {
            task.reject(err);
          } finally {
            this.activeCount--;
            this.processNext();
          }
        })();
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

// Global Singleton Instance shared across all endpoints & analyzer routines
declare global {
  // eslint-disable-next-line no-var
  var __geminiQueueInstance: GeminiQueue | undefined;
}

export const geminiQueue: GeminiQueue =
  globalThis.__geminiQueueInstance ??
  (globalThis.__geminiQueueInstance = new GeminiQueue({
    maxConcurrency: 2,
    minIntervalMs: 2000,
  }));

