/**
 * Gemini Prompts & Schemas for High-Signal Heuristic Deep Scan
 */

export const DEEP_SCAN_SYSTEM_INSTRUCTION = `You are a Principal Software Architect, Bilingual Technical Writer, and Senior Engineering Portfolio Curator.
Your task is to analyze the provided High-Signal Repository Context and generate an authoritative technical case study alongside a persistent, compact AI Technical Dossier (aiContextDigest).

CONTEXT ANALYSIS DIRECTIVES:
1. Extract Real Challenges from Commits:
   - Carefully inspect the Developer Commit History. Commits with 'fix:', 'refactor:', 'revert:', 'perf:', or race condition / state fixes indicate genuine engineering friction and challenges encountered during development.
   - If commit history is sparse or unavailable, deduce concrete challenges from the architecture, state management patterns, and schema relations.
2. Gracefully Handle Missing / Boilerplate Documentation:
   - When the README is flagged as boilerplate (e.g. create-next-app defaults) or missing, DO NOT cite the boilerplate text. Instead, deduce the project's true purpose and mechanics strictly from the package manifest, schemas, config files, and code topology.
3. Architecture Over Fluff:
   - Avoid generic marketing buzzwords ('stunning', 'blazing fast', 'seamless').
   - Emphasize specific technical trade-offs, data models, state flows, and developer ergonomics.

STRICT BILINGUAL GUIDELINES:
1. English Content:
   - Authoritative, senior-level portfolio copy tailored for engineering managers and senior technical recruiters.
2. Persian (Farsi) Content:
   - Write fluent, idiomatic, and native Persian prose.
   - AVOID awkward or literal machine translations.
   - STRICT TECHNICAL ISOLATION: ALL frameworks, libraries, protocols, CLI commands, file paths, and environment variables MUST remain untranslated in English (LTR). NEVER phonetically transliterate English technology names into Persian script.

OUTPUT SCHEMA REQUIREMENTS:
Respond STRICTLY with valid JSON matching the specified schema.`;

export const DEEP_SCAN_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: {
      type: "STRING",
      description: "Clean, human-readable project title (e.g. 'Promptopia')",
    },
    title_fa: {
      type: "STRING",
      description: "Persian title with brand/tech name in English",
    },
    tagline_en: {
      type: "STRING",
      description: "Concise, punchy 1-2 sentence technical summary of project purpose in English",
    },
    tagline_fa: {
      type: "STRING",
      description: "Natural Persian translation of the tagline with technical entities in English LTR",
    },
    description_en: {
      type: "STRING",
      description: "Full architectural overview detailing system components and flow in English",
    },
    description_fa: {
      type: "STRING",
      description: "Full architectural overview in natural Persian prose with technical entities in English LTR",
    },
    goals: {
      type: "STRING",
      description: "Core problem the project solves, target audience, and primary engineering objectives in English",
    },
    goals_fa: {
      type: "STRING",
      description: "Persian explanation of project goals with technical entities in English LTR",
    },
    challenges: {
      type: "STRING",
      description: "Concrete technical trade-offs, race conditions, caching complexities, or hurdles derived from commit messages and schema/config patterns in English",
    },
    challenges_fa: {
      type: "STRING",
      description: "Persian explanation of technical challenges and trade-offs with technical entities in English LTR",
    },
    outcome_en: {
      type: "STRING",
      description: "Measurable engineering deliverables, architecture achievements, and results in English",
    },
    outcome_fa: {
      type: "STRING",
      description: "Persian explanation of deliverables and achievements with technical entities in English LTR",
    },
    techStack: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Curated list of primary technologies, frameworks, and libraries in English (LTR)",
    },
    aiContextDigest: {
      type: "OBJECT",
      properties: {
        summary: {
          type: "STRING",
          description: "High-density 2-3 sentence overview of the project functionality",
        },
        architecture: {
          type: "STRING",
          description: "Summary of architectural patterns (e.g. Next.js App Router, Prisma ORM, Zustand)",
        },
        coreFeatures: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Key technical capabilities and features",
        },
        technicalTradeoffs: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Explicit engineering trade-offs, caching decisions, or constraints",
        },
        rawDigest: {
          type: "STRING",
          description: "Compact, high-density technical summary preserving core architectural decisions and mechanisms for future micro-generation",
        },
        lastAnalyzedCommit: {
          type: "STRING",
          description: "Commit hash of the repository HEAD analyzed",
        },
        lastAnalyzedAt: {
          type: "STRING",
          description: "ISO timestamp of the analysis",
        },
      },
      required: [
        "summary",
        "architecture",
        "coreFeatures",
        "technicalTradeoffs",
        "rawDigest",
        "lastAnalyzedCommit",
        "lastAnalyzedAt",
      ],
    },
  },
  required: [
    "title",
    "tagline_en",
    "tagline_fa",
    "description_en",
    "description_fa",
    "goals",
    "challenges",
    "techStack",
    "aiContextDigest",
  ],
};

export function buildDeepScanUserPrompt(formattedPromptDigest: string): string {
  return `Please perform a Deep Scan Codebase Audit based on the following High-Signal Repository Context.

${formattedPromptDigest}

Synthesize this heuristic data into the requested JSON schema. Derive real technical challenges from the commit history and high-signal schemas/configs. Enforce all bilingual rules.`;
}
