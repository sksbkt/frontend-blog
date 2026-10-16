import "dotenv/config";
import { prisma } from "../lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { slugifyTech, BASELINE_TECH_DEFINITIONS } from "../lib/tech/service";

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
  ].filter((m): m is string => Boolean(m));

  return { ai, candidateModels };
}

async function syncMissingTechs() {
  console.log("Checking for missing tech definitions across all projects in Supabase...");

  const projects = await prisma.project.findMany({
    select: { technologies: true, slug: true },
  });

  const allTechs = Array.from(
    new Set(projects.flatMap((p) => p.technologies || []))
  );

  console.log(`Found ${allTechs.length} unique technology tags across projects:`, allTechs);

  for (const name of allTechs) {
    const slug = slugifyTech(name);
    const existing = await prisma.techDefinition.findUnique({
      where: { slug },
    });

    if (existing) {
      console.log(`  ✓ Already exists in Supabase: [${slug}] "${existing.name}"`);
      continue;
    }

    console.log(`  ⚙ Missing definition for [${slug}] "${name}". Resolving...`);

    // Check baseline first
    const normalizedKey = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const baseline =
      BASELINE_TECH_DEFINITIONS[slug] ||
      BASELINE_TECH_DEFINITIONS[normalizedKey];

    if (baseline) {
      await prisma.techDefinition.upsert({
        where: { slug },
        update: {
          name,
          summaryEn: baseline.en,
          summaryFa: baseline.fa,
          category: baseline.category,
        },
        create: {
          slug,
          name,
          summaryEn: baseline.en,
          summaryFa: baseline.fa,
          category: baseline.category,
        },
      });
      console.log(`  ✓ Saved from baseline to Supabase: [${slug}]`);
      continue;
    }

    // Call Gemini to generate definition
    const { ai, candidateModels } = getAiClient();
    const prompt = `Provide concise technical definitions for: ${name}.
Output JSON adhering strictly to:
{
  "name": "${name}",
  "category": "auth",
  "summary_en": "One-sentence technical definition in English",
  "summary_fa": "Professional Persian translation with English tech terms preserved in LTR"
}`;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.summary_en) {
            await prisma.techDefinition.upsert({
              where: { slug },
              update: {
                name,
                summaryEn: parsed.summary_en,
                summaryFa: parsed.summary_fa || parsed.summary_en,
                category: parsed.category || "other",
              },
              create: {
                slug,
                name,
                summaryEn: parsed.summary_en,
                summaryFa: parsed.summary_fa || parsed.summary_en,
                category: parsed.category || "other",
              },
            });
            console.log(`  ✓ Generated & saved to Supabase: [${slug}] "${name}"`);
            break;
          }
        }
      } catch (err) {
        console.warn(`    Model ${model} failed for ${name}:`, err);
      }
    }
  }

  const count = await prisma.techDefinition.count();
  console.log(`\nAll done! Total TechDefinitions now in Supabase: ${count}`);
}

syncMissingTechs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
