export interface TechDefinitionData {
  name: string;
  slug: string;
  summary_en: string;
  summary_fa: string;
  category?: string;
  summary?: string; // localized summary based on active locale
}

// In-memory client cache to prevent redundant network fetches
const memoryCache = new Map<string, TechDefinitionData>();

// In-flight batching queue
let batchQueue: Set<string> = new Set();
let batchTimeout: NodeJS.Timeout | null = null;
let currentLocale: "en" | "fa" = "en";
const pendingResolvers: Map<
  string,
  Array<(def: TechDefinitionData | null) => void>
> = new Map();

/**
 * Built-in baseline definitions for instantaneous zero-latency render
 */
export const BASELINE_TECH_DEFINITIONS: Record<
  string,
  { en: string; fa: string; category: string }
> = {
  react: {
    en: "A declarative, component-based JavaScript library for building high-performance web user interfaces.",
    fa: "یک کتابخانه اعلامی جاوااسکریپت مبتنی بر کامپوننت برای ساخت رابط‌های کاربری وب با کارایی بالا.",
    category: "frontend",
  },
  nextjs: {
    en: "A full-stack React framework enabling server-side rendering, static site generation, and optimized performance.",
    fa: "یک فریم‌ورک فول‌استک برای React با قابلیت‌های Server-Side Rendering و تولید صفحات ایستا.",
    category: "frontend",
  },
  typescript: {
    en: "A strongly typed superset of JavaScript that compiles to plain JavaScript with compile-time type safety.",
    fa: "یک فرامجموعه تایپ‌شده برای JavaScript که ایمنی نوع داده‌ها را در زمان کامپایل فراهم می‌کند.",
    category: "language",
  },
  javascript: {
    en: "A lightweight, interpreted programming language that powers dynamic, interactive client-side web behaviors.",
    fa: "یک زبان برنامه‌نویسی پویا و تفسیری که هسته اصلی تعاملات در وب مدرن را تشکیل می‌دهد.",
    category: "language",
  },
  tailwindcss: {
    en: "A utility-first CSS framework packed with classes that can be composed to build any design directly in markup.",
    fa: "یک فریم‌ورک کاربردی CSS برای طراحی سریع و مدرن رابط کاربری بدون خروج از فایل‌های کد.",
    category: "styling",
  },
  nodejs: {
    en: "An asynchronous, event-driven JavaScript runtime built on Chrome's V8 engine for scalable network applications.",
    fa: "یک محیط اجرای جاوااسکریپت غیرهمگام مبتنی بر موتور V8 کروم برای ساخت سرویس‌های سمت سرور مقیاس‌پذیر.",
    category: "backend",
  },
  postgresql: {
    en: "A powerful, open-source object-relational database system known for reliability, feature robustness, and data integrity.",
    fa: "یک سیستم مدیریت دیتابیس رابطه‌ای قدرتمند، منبع‌باز و مطمئن با پشتیبانی از استانداردهای پیچیده SQL.",
    category: "database",
  },
  prisma: {
    en: "A next-generation Node.js and TypeScript ORM providing automated migrations and type-safe database queries.",
    fa: "یک ORM مدرن برای Node.js و TypeScript که کوئری‌های تایپ‌سیف و مدیریت خودکار مایگریشن را ارائه می‌دهد.",
    category: "database",
  },
  sanity: {
    en: "A customizable headless CMS featuring real-time collaborative editing and structured content as data.",
    fa: "یک CMS هدلس فوق‌العاده منعطف با ویرایش زنده و ارائه محتوای ساختاریافته به صورت داده.",
    category: "backend",
  },
  docker: {
    en: "A containerization platform that packages applications and their dependencies into lightweight, isolated containers.",
    fa: "یک پلتفرم کانتینرسازی برای بسته‌بندی اپلیکیشن و تمام پیش‌نیازهای آن در کانتینرهای ایزوله و سبک.",
    category: "devops",
  },
  python: {
    en: "A high-level programming language emphasizing code readability, versatility, and rich scientific computing libraries.",
    fa: "یک زبان برنامه‌نویسی سطح بالا و چندمنظوره با تمرکز بر خوانایی کد و اکوسیستم وسیع علمی و هوش مصنوعی.",
    category: "language",
  },
};

/**
 * Normalizes a tech string into a slug for Sanity & cache lookup
 */
export function slugifyTech(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\+/g, "plus")
    .replace(/#/g, "sharp")
    .replace(/\.js$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Resolve instant definition from baseline or memory cache
 */
export function getCachedTechDefinition(
  name: string,
  locale: "en" | "fa" = "en"
): TechDefinitionData | null {
  const slug = slugifyTech(name);
  const normalizedKey = name.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Check memory cache
  const cached = memoryCache.get(slug);
  if (cached) {
    return {
      ...cached,
      summary: locale === "fa" ? cached.summary_fa : cached.summary_en,
    };
  }

  // Check baseline dictionary
  const baseline =
    BASELINE_TECH_DEFINITIONS[slug] || BASELINE_TECH_DEFINITIONS[normalizedKey];
  if (baseline) {
    const data: TechDefinitionData = {
      name,
      slug,
      summary_en: baseline.en,
      summary_fa: baseline.fa,
      category: baseline.category,
      summary: locale === "fa" ? baseline.fa : baseline.en,
    };
    memoryCache.set(slug, data);
    return data;
  }

  return null;
}

/**
 * Batched, debounced fetching for unknown tech definitions
 */
export async function fetchTechDefinition(
  name: string,
  locale: "en" | "fa" = "en"
): Promise<TechDefinitionData | null> {
  const cached = getCachedTechDefinition(name, locale);
  if (cached) return cached;

  currentLocale = locale;
  const slug = slugifyTech(name);

  return new Promise((resolve) => {
    if (!pendingResolvers.has(slug)) {
      pendingResolvers.set(slug, []);
    }
    pendingResolvers.get(slug)!.push(resolve);
    batchQueue.add(name);

    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }

    batchTimeout = setTimeout(processBatchQueue, 40);
  });
}

async function processBatchQueue(): Promise<void> {
  const namesToFetch = Array.from(batchQueue);
  batchQueue = new Set();
  batchTimeout = null;

  if (namesToFetch.length === 0) return;

  try {
    const res = await fetch("/api/tech/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: namesToFetch, locale: currentLocale }),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch tech definitions: ${res.status}`);
    }

    const json = await res.json();
    const definitions: Record<string, TechDefinitionData> =
      json.definitions || {};

    // Fulfill all resolvers
    for (const name of namesToFetch) {
      const slug = slugifyTech(name);
      const def = definitions[slug] || definitions[name] || null;

      if (def) {
        memoryCache.set(slug, def);
      }

      const resolvers = pendingResolvers.get(slug) || [];
      pendingResolvers.delete(slug);
      resolvers.forEach((cb) => cb(def));
    }
  } catch (error) {
    console.warn("[TechService] Batch fetch failed:", error);
    // Resolve with fallback or null
    for (const name of namesToFetch) {
      const slug = slugifyTech(name);
      const resolvers = pendingResolvers.get(slug) || [];
      pendingResolvers.delete(slug);
      resolvers.forEach((cb) => cb(null));
    }
  }
}
