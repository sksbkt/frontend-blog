import { GoogleGenAI } from "@google/genai";
import { RepoContext } from "@/lib/github/repo-inspector";
import { geminiQueue } from "@/lib/gemini/queue";

export type EnvVariableDef = {
  key: string;
  required: boolean;
  description: string;
  isSecret: boolean;
};

export type RepoAuditResult = {
  overallScore: number;
  documentationStatus: "missing" | "basic" | "good" | "comprehensive";
  requiresEnv: boolean;
  envVariables: EnvVariableDef[];
  summary: {
    en: string;
    fa: string;
  };
  strengths: {
    en: string[];
    fa: string[];
  };
  improvements: {
    en: string[];
    fa: string[];
  };
  techStackHighlights: string[];
  bilingualReadmeDraft: string;
};

const auditSystemPrompt = `
You are an expert full-stack code auditor and technical writer.
You analyze GitHub repository contexts (structure, package.json dependencies, config files, entry point snippet, detected environment variables, and existing README) to produce:
1. An objective technical audit report detailing strengths and concrete improvement areas in both English and Persian.
2. A strict environment variable audit: detect whether the project requires environment variables or external service keys (e.g. Supabase, Firebase, OpenAI, Stripe, Database, Auth secrets) to build, run, or deploy.
3. A professional, modern, bilingual (English + Persian overview) README.md in complete GitHub Markdown format.

Your response MUST be valid JSON adhering strictly to this schema:
{
  "overallScore": 85,
  "documentationStatus": "good",
  "requiresEnv": true,
  "envVariables": [
    {
      "key": "DATABASE_URL",
      "required": true,
      "description": "Database connection string",
      "isSecret": true
    }
  ],
  "summary": {
    "en": "Factual overview of the repository architecture and code quality.",
    "fa": "بررسی اجمالی و واقع‌بینانه از معماری مخزن و کیفیت کد به زبان فارسی."
  },
  "strengths": {
    "en": ["Bullet 1", "Bullet 2", "Bullet 3"],
    "fa": ["مورد ۱", "مورد ۲", "مورد ۳"]
  },
  "improvements": {
    "en": ["Actionable improvement 1", "Actionable improvement 2"],
    "fa": ["پیشنهاد بهبود ۱", "پیشنهاد بهبود ۲"]
  },
  "techStackHighlights": ["React", "TypeScript", "Tailwind CSS"],
  "bilingualReadmeDraft": "# Project Title\\n\\n<p align=\\"center\\">\\n  <img src=\\"./assets/preview.gif\\" alt=\\"Demo Preview\\" width=\\"100%\\" />\\n</p>\\n\\n<p align=\\"center\\">\\n  <img src=\\"./assets/hero.png\\" width=\\"60%\\" alt=\\"Desktop View\\" />\\n  <img src=\\"./assets/mobile.png\\" width=\\"30%\\" alt=\\"Mobile View\\" />\\n</p>\\n\\n> Professional English and Persian README markdown content with badges, architecture overview, installation, and usage..."
}

Rules:
- Be factual and objective based solely on the provided repository context.
- In bilingualReadmeDraft, you MUST include the visual preview block immediately under the main # <Project Title> heading:
  <p align="center">
    <img src="./assets/preview.gif" alt="Demo Preview" width="100%" />
  </p>
  <p align="center">
    <img src="./assets/hero.png" width="60%" alt="Desktop View" />
    <img src="./assets/mobile.png" width="30%" alt="Mobile View" />
  </p>
- If detectedEnvKeys contains keys or package dependencies require backend API keys, set requiresEnv: true and explain each variable in envVariables. If it is a purely static demo requiring no external services, set requiresEnv: false and envVariables: [].
- Avoid vague promotional marketing phrases like "revolutionary", "best", "world-class".
- The bilingualReadmeDraft must be formatted cleanly in GitHub Markdown, featuring both English documentation and Persian sections for accessibility.
- Return JSON only.
`.trim();

export async function generateRepoAudit(
  context: RepoContext,
): Promise<RepoAuditResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Set GEMINI_API_KEY in your environment variables.",
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
  ].filter((m): m is string => Boolean(m));

  const promptInput = {
    repository: context.repository,
    hasReadme: context.readme.exists,
    readmeExcerpt: context.readme.content.slice(0, 4000),
    packageJson: context.packageJson,
    detectedEnvKeys: context.detectedEnvKeys || [],
    fileStructure: {
      totalFiles: context.structure.totalFiles,
      topLevelFiles: context.structure.topLevelFiles,
      configFiles: context.structure.configFiles,
      treeSample: context.structure.treeSample,
      entryPoint: context.structure.entryPoint,
    },
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
              parts: [
                {
                  text: JSON.stringify(promptInput),
                },
              ],
            },
          ],
          config: {
            systemInstruction: auditSystemPrompt,
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        })
      );

      const text = response.text;
      if (text) {
        const cleaned = text
          .trim()
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, "");
        const parsed = JSON.parse(cleaned) as RepoAuditResult;

        const fallbackEnvVars: EnvVariableDef[] = (context.detectedEnvKeys || []).map((k) => ({
          key: k,
          required: true,
          description: "Environment variable detected from codebase references.",
          isSecret: /key|secret|token|pass|auth|pwd|cred/i.test(k),
        }));

        return {
          overallScore: typeof parsed.overallScore === "number" ? parsed.overallScore : 80,
          documentationStatus: parsed.documentationStatus || (context.readme.exists ? "good" : "missing"),
          requiresEnv:
            typeof parsed.requiresEnv === "boolean"
              ? parsed.requiresEnv
              : fallbackEnvVars.length > 0,
          envVariables: Array.isArray(parsed.envVariables) && parsed.envVariables.length > 0
            ? parsed.envVariables
            : fallbackEnvVars,
          summary: {
            en: parsed.summary?.en || "Repository analyzed.",
            fa: parsed.summary?.fa || "مخزن بررسی شد.",
          },
          strengths: {
            en: Array.isArray(parsed.strengths?.en) ? parsed.strengths.en : [],
            fa: Array.isArray(parsed.strengths?.fa) ? parsed.strengths.fa : [],
          },
          improvements: {
            en: Array.isArray(parsed.improvements?.en) ? parsed.improvements.en : [],
            fa: Array.isArray(parsed.improvements?.fa) ? parsed.improvements.fa : [],
          },
          techStackHighlights: Array.isArray(parsed.techStackHighlights)
            ? parsed.techStackHighlights
            : [],
          bilingualReadmeDraft:
            typeof parsed.bilingualReadmeDraft === "string"
              ? parsed.bilingualReadmeDraft
              : `# ${context.repository.name}\n\nProject overview draft.`,
        };
      }
    } catch (err) {
      console.warn(`[generateRepoAudit] Model ${model} failed, trying next:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("Gemini returned an empty audit response.");
}
