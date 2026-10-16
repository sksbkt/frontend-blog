import { NextResponse } from "next/server";
import { resolveTechStack, sanitizeLookupKey } from "@/lib/tech-resolver";
import { isRateLimitOrCapacityError } from "@/lib/gemini/queue";

interface TechQueryBody {
  names?: string[];
  locale?: "en" | "fa";
}

export async function POST(request: Request) {
  try {
    const body: TechQueryBody = await request.json().catch(() => ({}));
    const rawNames = body.names || [];
    const locale = body.locale || "en";

    const uniqueNames = Array.from(
      new Set(
        rawNames
          .map((n) => (typeof n === "string" ? n.trim() : ""))
          .filter(Boolean)
      )
    );

    if (uniqueNames.length === 0) {
      return NextResponse.json({ success: true, definitions: {} });
    }

    const definitions: Record<
      string,
      {
        name: string;
        slug: string;
        summary_en: string;
        summary_fa: string;
        category?: string;
        icon?: string | null;
        summary: string;
      }
    > = {};

    const resolved = await resolveTechStack(uniqueNames);

    for (const item of resolved) {
      if (!item) continue;
      const def = {
        name: item.name,
        slug: item.slug,
        summary_en: item.summaryEn,
        summary_fa: item.summaryFa,
        category: item.category || "other",
        icon: item.icon || null,
        summary: locale === "fa" ? item.summaryFa : item.summaryEn,
      };

      definitions[item.slug] = def;
      definitions[item.name] = def;

      // Map each raw requested input to the definition if it matches slug or any alias
      for (const raw of uniqueNames) {
        const key = sanitizeLookupKey(raw);
        if (
          key === item.slug ||
          (item.aliases && item.aliases.some((a) => sanitizeLookupKey(a) === key))
        ) {
          definitions[raw] = def;
        }
      }
    }

    return NextResponse.json({
      success: true,
      definitions,
    });
  } catch (error) {
    console.error("[TechInfoRoute] Fatal Error:", error);
    const isRateLimited = isRateLimitOrCapacityError(error);
    return NextResponse.json(
      {
        success: false,
        message: isRateLimited
          ? "Gemini AI capacity is currently saturated. Please try again in a moment."
          : error instanceof Error
          ? error.message
          : "Failed to resolve tech definitions.",
        definitions: {},
      },
      { status: isRateLimited ? 429 : 500 }
    );
  }
}
