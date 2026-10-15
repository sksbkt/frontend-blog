import { GoogleGenAI } from "@google/genai";
import type { RepoContext } from "@/lib/github/repo-inspector";
import type { AiContextDigest } from "@/components/admin/types";
import type { HighSignalRepoContext } from "@/lib/github/scanner";
import {
  DEEP_SCAN_SYSTEM_INSTRUCTION,
  DEEP_SCAN_RESPONSE_SCHEMA,
  buildDeepScanUserPrompt,
} from "@/lib/gemini/prompts";
import {
  geminiQueue,
  isRateLimitOrCapacityError,
  GeminiRateLimitError,
} from "@/lib/gemini/queue";


const canonicalTechnologyNames: Record<string, string> = {
  ری‌اکت: "React",
  "ری‌اکت جی‌اس": "React",
  "ری اکت": "React",
  نکست: "Next.js",
  "نکست جی‌اس": "Next.js",
  "نکست جی اس": "Next.js",
  تایپ‌اسکریپت: "TypeScript",
  "تایپ اسکریپت": "TypeScript",
  جاوااسکریپت: "JavaScript",
  "جاوا اسکریپت": "JavaScript",
  تیلویند: "Tailwind CSS",
  "تیل ویند": "Tailwind CSS",
  نود: "Node.js",
  "نود جی‌اس": "Node.js",
  اکسپرس: "Express",
  ویته: "Vite",
  ورسل: "Vercel",
  سنیتی: "Sanity",
  گیت‌هاب: "GitHub",
  رداکس: "Redux",
  زستند: "Zustand",
  پستگرس: "PostgreSQL",
  پریسما: "Prisma",
  سوپابیس: "Supabase",
};

export function cleanPersianTechEntities(text: string): string {
  let cleaned = text;
  const entries = Object.entries(canonicalTechnologyNames).sort(
    ([a], [b]) => b.length - a.length
  );
  for (const [faName, canonical] of entries) {
    cleaned = cleaned.replaceAll(faName, canonical);
  }
  return cleaned;
}

export type GrandAnalysisOutput = {
  title: { en: string; fa: string };
  slug: string;
  description: { en: string; fa: string };
  technologies: string[];
  github: string;
  demo?: string;
  content: {
    overview: { en: string; fa: string };
    challenges: { en: string; fa: string };
    outcome: { en: string; fa: string };
  };
  aiContextDigest: {
    summary: string;
    architecture: string;
    coreFeatures: string[];
    technicalTradeoffs?: string[];
    targetAudience: string;
    rawDigest: string;
    lastAnalyzedCommit: string;
    lastAnalyzedAt: string;
  };
};

export type HeuristicAnalysisOutput = {
  title: { en: string; fa: string };
  slug: string;
  description: { en: string; fa: string };
  technologies: string[];
  github: string;
  demo?: string;
  content: {
    overview: { en: string; fa: string };
    challenges: { en: string; fa: string };
    outcome: { en: string; fa: string };
  };
  aiContextDigest: {
    summary: string;
    architecture: string;
    coreFeatures: string[];
    technicalTradeoffs: string[];
    targetAudience?: string;
    rawDigest: string;
    lastAnalyzedCommit: string;
    lastAnalyzedAt: string;
  };
  rawResponse?: {
    title: string;
    tagline_en: string;
    tagline_fa: string;
    description_en: string;
    description_fa: string;
    goals: string;
    challenges: string;
    techStack: string[];
  };
};

function getAiClient(): { ai: GoogleGenAI; candidateModels: string[] } {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment."
    );
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

/**
 * GRAND GENERATOR: Full Repository Analysis
 * Analyzes repository context (README, files, package.json, entry points)
 * and generates both project draft fields and the high-density aiContextDigest.
 */
export async function analyzeRepositoryGrand(
  context: RepoContext,
  commitSha?: string
): Promise<GrandAnalysisOutput> {
  const { ai, candidateModels } = getAiClient();

  const promptInput = {
    repository: {
      name: context.repository.name,
      fullName: context.repository.fullName,
      description: context.repository.description,
      htmlUrl: context.repository.htmlUrl,
      homepage: context.repository.homepage,
      language: context.repository.language,
      topics: context.repository.topics,
      defaultBranch: context.repository.defaultBranch,
    },
    hasReadme: context.readme.exists,
    readmeExcerpt: context.readme.content.slice(0, 5000),
    packageJson: context.packageJson,
    detectedEnvKeys: context.detectedEnvKeys,
    structure: {
      totalFiles: context.structure.totalFiles,
      topLevelFiles: context.structure.topLevelFiles,
      configFiles: context.structure.configFiles,
      treeSample: context.structure.treeSample.slice(0, 50),
      entryPointPath: context.structure.entryPoint?.path || null,
      entryPointSnippet: (context.structure.entryPoint?.snippet || "").slice(0, 1500),
    },
  };

  const systemInstruction = `You are a Principal Software Architect and Portfolio Curator.
Analyze the provided GitHub repository context and generate a complete portfolio case study and an internal high-density AI technical dossier (aiContextDigest).

STRICT BILINGUAL GUIDELINES:
1. English Content:
   - High-impact, professional engineering portfolio copy.
   - Highlight software architecture, design patterns, security, and developer ergonomics.
   - Avoid generic buzzwords (e.g., 'amazing', 'stunning', 'best').

2. Persian (Farsi) Content:
   - Write natural, elegant, native Persian prose.
   - DO NOT translate literally or produce awkward machine translations.
   - STRICT TECHNICAL ISOLATION: ALL frameworks, libraries, technologies, CLI commands, file paths, and environment variables MUST remain untranslated in English (LTR). NEVER transliterate English brand/tech names into Persian script.

3. AI Context Digest (aiContextDigest):
   - A compact, unified technical dossier (~500-800 tokens max).
   - summary: 2-3 sentences explaining core functionality and primary value.
   - architecture: Key patterns (e.g. Next.js App Router, SSR/ISR, Zustand state, Tailwind, REST/GraphQL APIs).
   - coreFeatures: 4-6 concise technical capabilities.
   - targetAudience: Specific end-user or engineering audience.
   - rawDigest: High-density technical summary preserving core architectural decisions and mechanisms for future micro-generation.

Respond STRICTLY with valid JSON adhering to the specified schema.`;

  const responseSchema = {
    type: "OBJECT",
    properties: {
      title: {
        type: "OBJECT",
        properties: {
          en: { type: "STRING" },
          fa: { type: "STRING" },
        },
        required: ["en", "fa"],
      },
      slug: { type: "STRING" },
      description: {
        type: "OBJECT",
        properties: {
          en: { type: "STRING" },
          fa: { type: "STRING" },
        },
        required: ["en", "fa"],
      },
      technologies: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      content: {
        type: "OBJECT",
        properties: {
          overview: {
            type: "OBJECT",
            properties: {
              en: { type: "STRING" },
              fa: { type: "STRING" },
            },
            required: ["en", "fa"],
          },
          challenges: {
            type: "OBJECT",
            properties: {
              en: { type: "STRING" },
              fa: { type: "STRING" },
            },
            required: ["en", "fa"],
          },
          outcome: {
            type: "OBJECT",
            properties: {
              en: { type: "STRING" },
              fa: { type: "STRING" },
            },
            required: ["en", "fa"],
          },
        },
        required: ["overview", "challenges", "outcome"],
      },
      aiContextDigest: {
        type: "OBJECT",
        properties: {
          summary: { type: "STRING" },
          architecture: { type: "STRING" },
          coreFeatures: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          targetAudience: { type: "STRING" },
          rawDigest: { type: "STRING" },
        },
        required: ["summary", "architecture", "coreFeatures", "targetAudience", "rawDigest"],
      },
    },
    required: ["title", "slug", "description", "technologies", "content", "aiContextDigest"],
  };

  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const response = await geminiQueue.run(async () =>
        ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: JSON.stringify(promptInput) }],
            },
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.2,
          },
        })
      );


      const text = response.text?.trim();
      if (!text) continue;

      const parsed = JSON.parse(text);

      const normalizedSlug = (parsed.slug || context.repository.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      return {
        title: {
          en: parsed.title?.en || context.repository.name,
          fa: cleanPersianTechEntities(parsed.title?.fa || parsed.title?.en || context.repository.name),
        },
        slug: normalizedSlug,
        description: {
          en: parsed.description?.en || context.repository.description || "Portfolio project.",
          fa: cleanPersianTechEntities(parsed.description?.fa || ""),
        },
        technologies: Array.isArray(parsed.technologies) ? parsed.technologies : [],
        github: context.repository.htmlUrl,
        demo: context.repository.homepage || "",
        content: {
          overview: {
            en: parsed.content?.overview?.en || "",
            fa: cleanPersianTechEntities(parsed.content?.overview?.fa || ""),
          },
          challenges: {
            en: parsed.content?.challenges?.en || "",
            fa: cleanPersianTechEntities(parsed.content?.challenges?.fa || ""),
          },
          outcome: {
            en: parsed.content?.outcome?.en || "",
            fa: cleanPersianTechEntities(parsed.content?.outcome?.fa || ""),
          },
        },
        aiContextDigest: {
          summary: parsed.aiContextDigest?.summary || "",
          architecture: parsed.aiContextDigest?.architecture || "",
          coreFeatures: Array.isArray(parsed.aiContextDigest?.coreFeatures)
            ? parsed.aiContextDigest.coreFeatures
            : [],
          targetAudience: parsed.aiContextDigest?.targetAudience || "",
          rawDigest: parsed.aiContextDigest?.rawDigest || "",
          lastAnalyzedCommit: commitSha || "latest",
          lastAnalyzedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      lastError = err;
      console.warn(`[GrandAnalyzer] Model ${model} failed, trying next...`, err);
    }
  }

  if (isRateLimitOrCapacityError(lastError)) {
    throw new GeminiRateLimitError();
  }

  throw new Error(
    `Grand AI Analysis failed on all candidate models. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * HEURISTIC DEEP SCAN ANALYZER
 * Analyzes curated high-signal repository context (structural topology, dependencies,
 * models/schemas, core configs, and developer commit history) using Gemini.
 */
export async function analyzeRepositoryHeuristic(
  context: HighSignalRepoContext
): Promise<HeuristicAnalysisOutput> {
  const { ai, candidateModels } = getAiClient();

  const userPrompt = buildDeepScanUserPrompt(context.formattedPromptDigest);

  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const response = await geminiQueue.run(async () =>
        ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          config: {
            systemInstruction: DEEP_SCAN_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: DEEP_SCAN_RESPONSE_SCHEMA,
            temperature: 0.2,
          },
        })
      );


      const text = response.text?.trim();
      if (!text) continue;

      const parsed = JSON.parse(text);

      const cleanTitleEn = parsed.title || context.repository.name;
      const cleanTitleFa = cleanPersianTechEntities(
        parsed.title_fa || parsed.title || context.repository.name
      );

      const normalizedSlug = (cleanTitleEn || context.repository.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const taglineEn =
        parsed.tagline_en ||
        parsed.description_en?.slice(0, 250) ||
        context.repository.description ||
        "Portfolio project.";
      const taglineFa = cleanPersianTechEntities(
        parsed.tagline_fa || parsed.description_fa?.slice(0, 250) || ""
      );

      const descriptionEn = parsed.description_en || parsed.tagline_en || "";
      const descriptionFa = cleanPersianTechEntities(
        parsed.description_fa || parsed.tagline_fa || ""
      );

      const challengesEn = parsed.challenges || "";
      const challengesFa = cleanPersianTechEntities(
        parsed.challenges_fa || parsed.challenges || ""
      );

      const outcomeEn = parsed.goals || parsed.outcome_en || "";
      const outcomeFa = cleanPersianTechEntities(
        parsed.goals_fa || parsed.outcome_fa || parsed.goals || ""
      );

      const techStack = Array.isArray(parsed.techStack) ? parsed.techStack : [];

      const digestSummary = parsed.aiContextDigest?.summary || taglineEn;
      const digestArchitecture =
        parsed.aiContextDigest?.architecture || descriptionEn.slice(0, 300);
      const digestCoreFeatures = Array.isArray(parsed.aiContextDigest?.coreFeatures)
        ? parsed.aiContextDigest.coreFeatures
        : [];
      const digestTradeoffs = Array.isArray(parsed.aiContextDigest?.technicalTradeoffs)
        ? parsed.aiContextDigest.technicalTradeoffs
        : [];
      const digestRaw =
        parsed.aiContextDigest?.rawDigest ||
        `Repo: ${context.fullName}. Stack: ${techStack.join(", ")}. ${digestSummary} Architecture: ${digestArchitecture}`;

      return {
        title: {
          en: cleanTitleEn,
          fa: cleanTitleFa,
        },
        slug: normalizedSlug,
        description: {
          en: taglineEn,
          fa: taglineFa,
        },
        technologies: techStack,
        github: `https://github.com/${context.fullName}`,
        demo: context.repository.homepage || "",
        content: {
          overview: {
            en: descriptionEn,
            fa: descriptionFa,
          },
          challenges: {
            en: challengesEn,
            fa: challengesFa,
          },
          outcome: {
            en: outcomeEn,
            fa: outcomeFa,
          },
        },
        aiContextDigest: {
          summary: digestSummary,
          architecture: digestArchitecture,
          coreFeatures: digestCoreFeatures,
          technicalTradeoffs: digestTradeoffs,
          targetAudience: "Developers and Technical Recruiters",
          rawDigest: digestRaw,
          lastAnalyzedCommit: context.latestCommitSha || "main",
          lastAnalyzedAt: new Date().toISOString(),
        },
        rawResponse: {
          title: cleanTitleEn,
          tagline_en: taglineEn,
          tagline_fa: taglineFa,
          description_en: descriptionEn,
          description_fa: descriptionFa,
          goals: outcomeEn,
          challenges: challengesEn,
          techStack,
        },
      };
    } catch (err) {
      lastError = err;
      console.warn(`[HeuristicDeepScan] Model ${model} failed, trying next...`, err);
    }
  }

  if (isRateLimitOrCapacityError(lastError)) {
    throw new GeminiRateLimitError();
  }

  throw new Error(
    `Heuristic Deep Scan failed on all candidate models. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * MICRO-GENERATOR: Field-Level Regeneration
 * Uses ONLY the stored aiContextDigest (no GitHub calls, minimal tokens).
 */
export async function regenerateFieldMicro(
  digest: AiContextDigest,
  fieldKey: string,
  customInstructions?: string
): Promise<{ fieldKey: string; value: string | string[] }> {
  if (!digest || (!digest.rawDigest && !digest.summary)) {
    const error = new Error("MISSING_DIGEST");
    // @ts-expect-error custom property
    error.code = "MISSING_DIGEST";
    throw error;
  }

  const { ai, candidateModels } = getAiClient();

  const compactDossier = [
    `Summary: ${digest.summary || "N/A"}`,
    `Architecture: ${digest.architecture || "N/A"}`,
    `Core Features: ${(digest.coreFeatures || []).join(", ")}`,
    `Target Audience: ${digest.targetAudience || "N/A"}`,
    `Technical Digest: ${digest.rawDigest || ""}`,
  ].join("\n");

  const isPersian = fieldKey.endsWith("_fa");
  const isArrayField = ["highlights", "features", "technologies", "coreFeatures"].includes(fieldKey);

  let fieldPrompt = "";
  switch (fieldKey) {
    case "title_en":
      fieldPrompt = "Generate a concise, professional English project title (2-5 words).";
      break;
    case "title_fa":
      fieldPrompt = "Generate a natural Persian project title. Keep technical names in English.";
      break;
    case "description_en":
    case "tagline_en":
      fieldPrompt =
        "Generate a punchy, 2-3 sentence technical description in English for engineering recruiters and senior developers. Emphasize the architectural problem solved and key technology.";
      break;
    case "description_fa":
    case "tagline_fa":
      fieldPrompt =
        "Generate a natural, native Persian (Farsi) 2-3 sentence description. STRICT REQUIREMENT: Keep ALL technology names, frameworks, and tools in English (LTR). Do NOT transliterate English brand names into Persian script.";
      break;
    case "overview_en":
      fieldPrompt =
        "Generate an Architecture Overview section in English (1-2 detailed paragraphs) discussing architecture, system flow, and design patterns.";
      break;
    case "overview_fa":
      fieldPrompt =
        "Generate an Architecture Overview section in natural Persian (Farsi). Keep all technical terms, architecture patterns, and stack names strictly in English (LTR).";
      break;
    case "challenges_en":
      fieldPrompt =
        "Generate a Technical Challenges section in English (1-2 paragraphs) focusing on non-trivial architectural, state management, or performance problems solved.";
      break;
    case "challenges_fa":
      fieldPrompt =
        "Generate a Technical Challenges section in natural Persian (Farsi). Explain technical roadblocks and solutions, keeping all technical terms in English (LTR).";
      break;
    case "outcome_en":
      fieldPrompt =
        "Generate a Project Outcome section in English focusing on delivered value, engineering metrics, and technical accomplishments.";
      break;
    case "outcome_fa":
      fieldPrompt =
        "Generate a Project Outcome section in natural Persian (Farsi), keeping all technical terms in English (LTR).";
      break;
    case "highlights":
    case "features":
    case "coreFeatures":
      fieldPrompt =
        "Generate a JSON array of 4-6 concise technical bullet points/features (each 5-15 words).";
      break;
    case "technologies":
      fieldPrompt =
        "Generate a JSON array of 5-10 key technology stack tags (e.g. ['Next.js', 'TypeScript', 'Tailwind CSS']).";
      break;
    default:
      fieldPrompt = `Regenerate the field '${fieldKey}' based on the technical dossier.`;
  }

  if (customInstructions && customInstructions.trim()) {
    fieldPrompt += `\nUser Custom Adjustment Instructions: ${customInstructions.trim()}`;
  }

  const systemInstruction = `You are a Senior Technical Writer and System Architect.
You must regenerate ONLY the requested field using ONLY the provided technical dossier.
DO NOT invent fictional technologies not present in the dossier.

BILINGUAL AND LOCALIZATION RULES:
- If regenerating Persian content:
  * Write natural, native Persian prose.
  * NEVER transliterate technical entities (e.g. use 'React', NEVER 'ری‌اکت'; use 'Next.js', NEVER 'نکست جی اس').
  * Keep all library, tool, file path, protocol, and command names strictly in English (LTR).
- If regenerating English content:
  * Deliver punchy, high-impact technical portfolio copy.

Output MUST be valid JSON adhering strictly to:
{
  "fieldKey": "${fieldKey}",
  "value": ${isArrayField ? '["string", ...]' : '"string"'}
}`;

  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const response = await geminiQueue.run(async () =>
        ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `PROJECT DOSSIER:\n${compactDossier}\n\nFIELD TO REGENERATE: ${fieldKey}\nINSTRUCTIONS: ${fieldPrompt}`,
                },
              ],
            },
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        })
      );


      const text = response.text?.trim();
      if (!text) continue;

      const parsed = JSON.parse(text);
      let value = parsed.value !== undefined ? parsed.value : parsed;

      if (typeof value === "string" && isPersian) {
        value = cleanPersianTechEntities(value);
      } else if (Array.isArray(value) && isPersian) {
        value = value.map((item) => (typeof item === "string" ? cleanPersianTechEntities(item) : item));
      }

      return {
        fieldKey,
        value,
      };
    } catch (err) {
      lastError = err;
      console.warn(`[MicroGenerator] Model ${model} failed for ${fieldKey}, trying next...`, err);
    }
  }

  if (isRateLimitOrCapacityError(lastError)) {
    throw new GeminiRateLimitError();
  }

  throw new Error(
    `Micro AI Generation failed on all candidate models. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * REFINE: Dual-tier row-level regeneration
 * Regenerates both EN (LTR) and FA (RTL) fields fresh from the stored aiContextDigest.
 */
export async function refineBilingualField(
  digest: AiContextDigest,
  fieldName: string,
  customInstructions?: string
): Promise<{ en: string; fa: string }> {
  if (!digest || (!digest.rawDigest && !digest.summary)) {
    const error = new Error("MISSING_DIGEST");
    // @ts-expect-error custom property
    error.code = "MISSING_DIGEST";
    throw error;
  }

  const { ai, candidateModels } = getAiClient();

  const compactDossier = [
    `Summary: ${digest.summary || "N/A"}`,
    `Architecture: ${digest.architecture || "N/A"}`,
    `Core Features: ${(digest.coreFeatures || []).join(", ")}`,
    `Target Audience: ${digest.targetAudience || "N/A"}`,
    `Technical Digest: ${digest.rawDigest || ""}`,
  ].join("\n");

  let fieldPrompt = "";
  switch (fieldName) {
    case "title":
      fieldPrompt =
        "Generate a concise, high-impact project title (2-5 words). English should be technical and clear; Persian should be natural with all tech brand names in English.";
      break;
    case "description":
    case "tagline":
      fieldPrompt =
        "Generate a punchy 2-3 sentence technical description/tagline. English should be professional and highlight architecture. Persian should be fluent and native.";
      break;
    case "overview":
      fieldPrompt =
        "Generate an Architecture Overview (1-2 paragraphs). Detail software architecture, design patterns, and system flow.";
      break;
    case "challenges":
      fieldPrompt =
        "Generate a Technical Challenges section (1-2 paragraphs). Discuss architectural, state, scalability, or performance hurdles solved.";
      break;
    case "outcome":
    case "highlights":
      fieldPrompt =
        "Generate a Project Outcome / Key Highlights section (1-2 paragraphs). Focus on delivered engineering value, performance benchmarks, and results.";
      break;
    default:
      fieldPrompt = `Generate synchronized bilingual content for the field '${fieldName}'.`;
  }

  if (customInstructions && customInstructions.trim()) {
    fieldPrompt += `\nUser Instructions: ${customInstructions.trim()}`;
  }

  const systemInstruction = `You are a Principal Software Architect and Bilingual Technical Writer.
Your task is to generate fresh, synchronized bilingual content (English and Persian) for the '${fieldName}' field based strictly on the provided technical dossier.

STRICT BILINGUAL AND LOCALIZATION RULES:
1. English Field ('en'):
   - Professional, high-impact technical portfolio copy for engineering leaders and senior developers.
   - Emphasize architectural decisions, tech specifics, and developer ergonomics.
2. Persian Field ('fa'):
   - Write natural, fluent, native Persian (Farsi) prose.
   - AVOID clunky or literal machine translations.
   - STRICT TECHNICAL ISOLATION: ALL technical entities (frameworks, libraries, CLI commands, file paths, protocols, and environment variables) MUST remain untranslated in English (LTR). NEVER transliterate English brand/tech names into Persian script.

Output MUST be valid JSON adhering strictly to:
{
  "en": "...",
  "fa": "..."
}`;

  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const response = await geminiQueue.run(async () =>
        ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `PROJECT DOSSIER:\n${compactDossier}\n\nFIELD TO REFINE: ${fieldName}\nREQUIREMENTS: ${fieldPrompt}`,
                },
              ],
            },
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.25,
          },
        })
      );


      const text = response.text?.trim();
      if (!text) continue;

      const parsed = JSON.parse(text);
      return {
        en: parsed.en || "",
        fa: cleanPersianTechEntities(parsed.fa || ""),
      };
    } catch (err) {
      lastError = err;
      console.warn(`[RefineBilingual] Model ${model} failed for ${fieldName}, trying next...`, err);
    }
  }

  if (isRateLimitOrCapacityError(lastError)) {
    throw new GeminiRateLimitError();
  }

  throw new Error(
    `Refine AI Generation failed on all candidate models. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * POLISH: Single-field smoothing and automatic sibling translation sync
 * Takes currentText in sourceLanguage, refines it without drastic changes,
 * and generates a high-quality synchronized translation for the counterpart field.
 */
export async function polishBilingualField(
  digest: AiContextDigest,
  fieldName: string,
  sourceLanguage: "en" | "fa",
  currentText: string,
  customInstructions?: string
): Promise<{ en: string; fa: string }> {
  if (!digest || (!digest.rawDigest && !digest.summary)) {
    const error = new Error("MISSING_DIGEST");
    // @ts-expect-error custom property
    error.code = "MISSING_DIGEST";
    throw error;
  }

  const { ai, candidateModels } = getAiClient();

  const compactDossier = [
    `Summary: ${digest.summary || "N/A"}`,
    `Architecture: ${digest.architecture || "N/A"}`,
    `Core Features: ${(digest.coreFeatures || []).join(", ")}`,
    `Technical Digest: ${digest.rawDigest || ""}`,
  ].join("\n");

  const systemInstruction = `You are a Senior Bilingual Technical Editor and Software Architect.
The user has provided their drafted text for '${fieldName}' in ${sourceLanguage === "en" ? "English" : "Persian"}.

YOUR TWO MANDATORY TASKS:
1. Polish the ${sourceLanguage === "en" ? "English" : "Persian"} text:
   - DO NOT rewrite drastically. Preserve the user's core ideas, tone, and specific phrasing.
   - Fix grammar, improve technical clarity, flow, and punchiness.
   - Keep it aligned with the technical context in the project dossier.

2. Generate the matching translation for ${sourceLanguage === "en" ? "Persian ('fa')" : "English ('en')"}:
   - Translate the polished text naturally and idiomatically.
   - STRICT PERSIAN ISOLATION: ALL technical entities (frameworks, library names, CLI commands, file paths, and environment variables) in the Persian text MUST remain untranslated in English (LTR). NEVER write Persian phonetic transliterations of English tech names.

Output MUST be valid JSON adhering strictly to:
{
  "en": "Polished or translated English text",
  "fa": "Polished or translated Persian text"
}`;

  let prompt = `PROJECT DOSSIER:\n${compactDossier}\n\nFIELD: ${fieldName}\nSOURCE LANGUAGE: ${sourceLanguage}\nCURRENT USER DRAFT:\n"${currentText}"`;
  if (customInstructions && customInstructions.trim()) {
    prompt += `\nUSER POLISH GUIDANCE: ${customInstructions.trim()}`;
  }

  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const response = await geminiQueue.run(async () =>
        ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        })
      );


      const text = response.text?.trim();
      if (!text) continue;

      const parsed = JSON.parse(text);
      return {
        en: parsed.en || "",
        fa: cleanPersianTechEntities(parsed.fa || ""),
      };
    } catch (err) {
      lastError = err;
      console.warn(`[PolishBilingual] Model ${model} failed for ${fieldName}, trying next...`, err);
    }
  }

  if (isRateLimitOrCapacityError(lastError)) {
    throw new GeminiRateLimitError();
  }

  throw new Error(
    `Polish AI Generation failed on all candidate models. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
