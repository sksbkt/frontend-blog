import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { writeClient } from "@/lib/sanity/write-client";
import { geminiQueue, isRateLimitOrCapacityError } from "@/lib/gemini/queue";
import { cleanPersianTechEntities } from "@/lib/gemini/analyzer";
import { slugifyTech, BASELINE_TECH_DEFINITIONS } from "@/lib/tech/service";

function getAiClient() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing Gemini API Key in environment.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
  ].filter((m): m is string => Boolean(m));

  return { ai, candidateModels };
}

interface TechQueryBody {
  names?: string[];
  locale?: "en" | "fa";
}

interface GeneratedTechDef {
  name: string;
  category: string;
  summary_en: string;
  summary_fa: string;
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

    const slugs = uniqueNames.map(slugifyTech);
    const definitions: Record<
      string,
      {
        name: string;
        slug: string;
        summary_en: string;
        summary_fa: string;
        category?: string;
        summary: string;
      }
    > = {};

    // 1. Populate baseline definitions first
    for (const name of uniqueNames) {
      const slug = slugifyTech(name);
      const normalizedKey = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const baseline =
        BASELINE_TECH_DEFINITIONS[slug] ||
        BASELINE_TECH_DEFINITIONS[normalizedKey];

      if (baseline) {
        const def = {
          name,
          slug,
          summary_en: baseline.en,
          summary_fa: baseline.fa,
          category: baseline.category,
          summary: locale === "fa" ? baseline.fa : baseline.en,
        };
        definitions[slug] = def;
        definitions[name] = def;
      }
    }

    // 2. Query Sanity for existing techDefinition documents
    try {
      const existingDocs = await writeClient.fetch<
        Array<{
          name: string;
          slug: string;
          summary_en: string;
          summary_fa: string;
          category?: string;
        }>
      >(
        `*[_type == "techDefinition" && (name in $uniqueNames || slug.current in $slugs)]{
          name,
          "slug": slug.current,
          summary_en,
          summary_fa,
          category
        }`,
        { uniqueNames, slugs }
      );

      for (const doc of existingDocs) {
        if (!doc.slug) continue;
        const def = {
          name: doc.name || doc.slug,
          slug: doc.slug,
          summary_en: doc.summary_en,
          summary_fa: doc.summary_fa,
          category: doc.category,
          summary: locale === "fa" ? doc.summary_fa : doc.summary_en,
        };
        definitions[doc.slug] = def;
        definitions[doc.name] = def;
      }
    } catch (sanityErr) {
      console.warn("[TechInfoRoute] Sanity lookup failed:", sanityErr);
    }

    // 3. Find missing techs that need AI generation
    const missingNames = uniqueNames.filter((name) => {
      const slug = slugifyTech(name);
      return !definitions[slug] && !definitions[name];
    });

    if (missingNames.length > 0) {
      const { ai, candidateModels } = getAiClient();

      const systemInstruction = `You are a concise, senior software architect providing ultra-crisp technical definitions for developer portfolio tags.
For each requested technology, provide:
- name: The exact canonical name (e.g. 'Next.js', 'PostgreSQL', 'Zustand').
- category: One of [frontend, backend, database, styling, devops, language, testing, ai, other].
- summary_en: Exactly 1 sentence, strictly under 25 words. Focus on core architectural value or purpose.
- summary_fa: Natural, professional Persian translation. STRICT ISOLATION: Keep all technical entities, libraries, and frameworks untranslated in English (LTR).

Output MUST be valid JSON adhering strictly to:
{
  "definitions": [
    {
      "name": "string",
      "category": "string",
      "summary_en": "string",
      "summary_fa": "string"
    }
  ]
}`;

      const prompt = `Provide concise technical definitions for these technologies: ${missingNames.join(
        ", "
      )}`;

      let generatedDefs: GeneratedTechDef[] = [];

      for (const model of candidateModels) {
        try {
          const response = await geminiQueue.run(async () =>
            ai.models.generateContent({
              model,
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              config: {
                systemInstruction,
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            })
          );

          const text = response.text?.trim();
          if (text) {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed.definitions)) {
              generatedDefs = parsed.definitions;
              break;
            }
          }
        } catch (genErr) {
          console.warn(`[TechInfoRoute] Model ${model} generation failed:`, genErr);
        }
      }

      // 4. Save newly generated definitions to Sanity in background & add to response
      for (const item of generatedDefs) {
        if (!item.name || !item.summary_en) continue;

        const slug = slugifyTech(item.name);
        const cleanedFa = cleanPersianTechEntities(item.summary_fa || item.summary_en);

        const techDef = {
          name: item.name,
          slug,
          summary_en: item.summary_en,
          summary_fa: cleanedFa,
          category: item.category || "other",
          summary: locale === "fa" ? cleanedFa : item.summary_en,
        };

        definitions[slug] = techDef;
        definitions[item.name] = techDef;

        // Background write to Sanity CMS
        (async () => {
          try {
            const docId = `techDefinition.${slug}`;
            await writeClient.createIfNotExists({
              _id: docId,
              _type: "techDefinition",
              name: item.name,
              slug: { _type: "slug", current: slug },
              summary_en: item.summary_en,
              summary_fa: cleanedFa,
              category: item.category || "other",
            });
          } catch (writeErr) {
            console.warn(`[TechInfoRoute] Failed to cache ${slug} in Sanity:`, writeErr);
          }
        })();
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
