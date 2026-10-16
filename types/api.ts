export type DataSourceOrigin =
  | "CACHE_DATABASE"
  | "GEMINI_GENERATION"
  | "GITHUB_API";

export interface TelemetryMeta {
  source: DataSourceOrigin;
  durationMs: number;
  timestamp: string;
  details?: Record<string, any>;
}

export interface ApiResponse<T> {
  data: T;
  meta: TelemetryMeta;
}

// For multi-step tech resolution
export interface TechCheckResult {
  cached: Array<{
    name: string;
    slug: string;
    summaryEn: string;
    summaryFa: string;
    icon?: string | null;
    category?: string | null;
  }>;
  missing: string[]; // Raw names that need Gemini synthesis
}

// For SCA Deep Scan SSE stream
export type ScanPipelineStage =
  | "AUDITING_REPO_TREE"
  | "EXTRACTING_MANIFESTS"
  | "SYNTHESIZING_GEMINI"
  | "PERSISTING_DATABASE"
  | "COMPLETE"
  | "ERROR";

export interface ScanStreamEvent {
  stage: ScanPipelineStage;
  message: string;
  progressPercent: number;
  data?: any;
}

// For Real-time Telemetry SSE Stream & Developer HUD
export type TelemetrySource = "DB_CACHE" | "GEMINI_SYNTHESIS" | "GITHUB_API";
export type TelemetryEntityType = "tech" | "og-image" | "sca-scan" | "project";
export type TelemetryStatus = "SUCCESS" | "ERROR" | "FALLBACK";

export interface TelemetryStreamEvent {
  id: string;
  timestamp: string;
  traceId: string;
  entityType: TelemetryEntityType;
  key: string;
  source: TelemetrySource;
  latencyMs: number;
  status: TelemetryStatus;
  details?: Record<string, any>;
}

