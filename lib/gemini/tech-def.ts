/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * Self-Learning Canonical Technology Taxonomy & Disambiguation Engine
 */

import { GoogleGenAI } from "@google/genai";
import { geminiQueue } from "@/lib/gemini/queue";
import { cleanPersianTechEntities } from "@/lib/gemini/analyzer";

export interface GeneratedTechItem {
  rawInput: string;
  name: string;
  slug: string;
  aliases: string[];
  summaryEn: string;
  summaryFa: string;
  category: string;
  icon?: string;
}

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
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
  ].filter((m): m is string => Boolean(m));

  return { ai, candidateModels };
}

/**
 * Disambiguates unknown technologies, generates canonical metadata, summaries,
 * and comprehensive known alias variations using Gemini AI.
 */
export async function generateMissingTechDefinitions(
  missingTechNames: string[]
): Promise<GeneratedTechItem[]> {
  if (!missingTechNames || missingTechNames.length === 0) {
    return [];
  }

  const { ai, candidateModels } = getAiClient();

  const prompt = `
You are an expert software taxonomy and package registry analyzer.
Analyze the following unknown technology names: ${JSON.stringify(missingTechNames)}.

For each item:
1. Identify the EXACT distinct technology (disambiguate if similar names exist, e.g., distinguish a game mod from a web framework).
2. "name": The official, capitalized display name (e.g., "React", "Next.js", "Tailwind CSS", "ACE3 Framework").
3. "slug": Lowercase, hyphen-delimited canonical identifier (e.g., "react", "next-js", "ace3-framework").
4. "aliases": An array of all common spelling, case, and packaging variations that refer to THIS EXACT SAME tool (e.g., for React: ["reactjs", "react.js", "react-js"]).
   - CRITICAL: Do NOT include ambiguous strings that could belong to another tool.
   - All aliases must be lowercase and stripped of special characters except hyphens and dots.
5. "summaryEn": A 1-sentence technical micro-summary in English explaining what it is and what problem it solves.
6. "summaryFa": A high-quality, natural Persian translation of the technical summary. Keep all English technology names, protocols, and acronyms in Latin LTR script.
7. "category": "frontend" | "backend" | "devops" | "database" | "mobile" | "gamedev" | "tools" | "ai"
8. "icon": Suggested SimpleIcons or Lucide icon slug (e.g., "react", "nextdotjs", "tailwindcss", "cpu").

Return ONLY valid JSON matching this schema:
[
  {
    "rawInput": "string",
    "name": "string",
    "slug": "string",
    "aliases": ["string"],
    "summaryEn": "string",
    "summaryFa": "string",
    "category": "string",
    "icon": "string"
  }
]
`;

  for (const model of candidateModels) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Gemini call timed out after 7000ms on model ${model}`));
        }, 7000);
        if (typeof timer.unref === "function") timer.unref();
      });

      const response = await Promise.race([
        geminiQueue.run(async () =>
          ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          })
        ),
        timeoutPromise,
      ]);

      const rawText = response.text?.trim();
      if (!rawText) continue;

      const cleanJson = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/g, "")
        .trim();

      const parsed = JSON.parse(cleanJson);
      const items: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.definitions)
        ? parsed.definitions
        : [];

      if (items.length > 0) {
        return items.map((item, index) => {
          const rawInput =
            item.rawInput ||
            missingTechNames[index] ||
            item.name ||
            "unknown";

          const cleanedFa = cleanPersianTechEntities(
            item.summaryFa || item.summary_fa || item.summaryEn || ""
          );

          const rawAliases: string[] = Array.isArray(item.aliases)
            ? item.aliases
            : [];

          return {
            rawInput,
            name: item.name || rawInput,
            slug: (item.slug || item.name || rawInput)
              .toLowerCase()
              .trim()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9.-]/g, ""),
            aliases: rawAliases.map((a) => String(a).toLowerCase().trim()),
            summaryEn: item.summaryEn || item.summary_en || "",
            summaryFa: cleanedFa,
            category: item.category || "tools",
            icon: item.icon || item.suggested_icon || undefined,
          };
        });
      }
    } catch (err) {
      console.warn(`[TechDef] Model ${model} generation failed:`, err);
    }
  }

  // Graceful fallback if Gemini generation is unreachable
  return missingTechNames.map((name) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9.-]/g, "");

    return {
      rawInput: name,
      name,
      slug,
      aliases: [slug],
      summaryEn: `${name} technology component.`,
      summaryFa: `مؤلفه و فناوری ${name}.`,
      category: "tools",
    };
  });
}
