import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { geminiQueue } from "@/lib/gemini/queue";

import { createProjectDraft } from "@/lib/sanity/create-project-draft";

type LocalizedText = {
  en: string;
  fa: string;
};

type ProjectContent = {
  overview: LocalizedText;
  challenges: LocalizedText;
  outcome: LocalizedText;
};

type TechnologyOutput = {
  name: string;
  description: string;
};

type ProjectOutput = {
  title: LocalizedText;
  slug: string;
  description: LocalizedText;
  technologies: TechnologyOutput[];
  github: string;
  demo: string;
  content: ProjectContent;
};

const forbiddenPromotionalPhrases = [
  "best",
  "amazing",
  "awesome",
  "beautiful",
  "excellent",
  "perfect",
  "powerful",
  "professional",
  "high-quality",
  "high quality",
  "seamless",
  "stunning",
  "impressive",
  "outstanding",

  "بهترین",
  "عالی",
  "فوق‌العاده",
  "حرفه‌ای",
  "بی‌نظیر",
  "قدرتمند",
];

const allowedPersianLatinTerms = new Set([
  "React",
  "React DOM",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "CSS",
  "CSS3",
  "HTML",
  "HTML5",
  "Tailwind CSS",
  "Node.js",
  "Express",
  "Three.js",
  "Vite",
  "Create React App",
  "GSAP",
  "Netlify",
  "Vercel",
  "Sanity",
  "GitHub",
  "API",
  "REST",
  "JSON",
  "SVG",
  "WebGL",
  "Sentry",
  "Redux",
  "Zustand",
  "Firebase",
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "Prisma",
  "Supabase",
  "Framer Motion",
  "Flexbox",
  "Grid",
  "CSS Grid",
  "UI",
  "UX",
  "DOM",
  "3D",
  "SPA",
  "PWA",
  "SEO",
  "Webpack",
  "Babel",
  "ESLint",
  "Prettier",
  "Jest",
  "Git",
  "npm",
  "yarn",
  "pnpm",
  "will-change",
  "transform",
  "transition",
  "animation",
  "keyframes",
  "sticky",
  "fixed",
  "relative",
  "absolute",
  "viewport",
  "calc",
  "clamp",
  "rem",
  "em",
  "px",
  "vh",
  "vw",
  "z-index",
  "backdrop-filter",
  "box-sizing",
  "IntersectionObserver",
  "ResizeObserver",
  "requestAnimationFrame",
  "localStorage",
  "sessionStorage",
  "Google",
  "OAuth",
  "OAuth2",
  "Auth",
  "Auth0",
  "Clerk",
  "Stripe",
  "NextAuth",
  "GraphQL",
  "Apollo",
  "Docker",
  "Kubernetes",
  "AWS",
  "PostCSS",
  "TailwindCSS",
  "Tailwind",
  "Axios",
  "Lucide",
  "Turbopack",
  "Shadcn",
  "JWT",
  "RESTful",
  "SDK",
  "CLI",
  "VSCode",
  "Figma",
  "OpenAI",
  "Anthropic",
  "Gemini",
  "AI",
]);

const canonicalTechnologyNames: Record<string, string> = {
  ری‌اکت: "React",
  "ری اکت": "React",
  "ری‌اکت جی‌اس": "React",
  "ری اکت جی اس": "React",

  "ری‌اکت دام": "React DOM",
  "ری اکت دام": "React DOM",

  سی‌اس‌اس: "CSS",
  "سی اس اس": "CSS",
  سی‌اس‌اس۳: "CSS3",
  "سی اس اس۳": "CSS3",
  "سی‌اس‌اس ۳": "CSS3",
  "سی اس اس ۳": "CSS3",

  اچ‌تی‌ام‌ال: "HTML",
  "اچ تی ام ال": "HTML",
  اچ‌تی‌ام‌ال۵: "HTML5",
  "اچ تی ام ال۵": "HTML5",

  جاوااسکریپت: "JavaScript",
  "جاوا اسکریپت": "JavaScript",

  تایپ‌اسکریپت: "TypeScript",
  "تایپ اسکریپت": "TypeScript",

  "نکست جی‌اس": "Next.js",
  "نکست جی اس": "Next.js",
  "نکست.جی‌اس": "Next.js",
  "نکست.جی اس": "Next.js",

  تیلویند: "Tailwind CSS",
  "تیل ویند": "Tailwind CSS",
  "تیلویند سی‌اس‌اس": "Tailwind CSS",

  "نود جی‌اس": "Node.js",
  "نود جی اس": "Node.js",

  اکسپرس: "Express",

  تری‌جی‌اس: "Three.js",
  "تری جی اس": "Three.js",

  ویته: "Vite",

  "کریت ری‌اکت اپ": "Create React App",
  "کریت ری اکت اپ": "Create React App",

  جی‌اس‌ای‌پی: "GSAP",

  نتلیفای: "Netlify",
  ورسل: "Vercel",
  سنیتی: "Sanity",
  گیت‌هاب: "GitHub",

  رداکس: "Redux",
  زستند: "Zustand",

  فایربیس: "Firebase",

  "مانگو دی‌بی": "MongoDB",
  "مانگو دی بی": "MongoDB",

  پستگرس: "PostgreSQL",
  پستگرس‌کیوال: "PostgreSQL",

  مای‌اس‌کیوال: "MySQL",

  پریسما: "Prisma",
  سوپابیس: "Supabase",

  "فریمر موشن": "Framer Motion",

  سن‌تری: "Sentry",
};

function normalizeTechnologyNames(text: string) {
  let result = text;

  const entries = Object.entries(canonicalTechnologyNames).sort(
    ([a], [b]) => b.length - a.length,
  );

  for (const [translatedName, canonicalName] of entries) {
    result = result.replaceAll(translatedName, canonicalName);
  }

  return result;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanEnglishText(text: string) {
  return text
    .replace(/\bpixel-perfect\b/gi, "detailed")
    .replace(/\bpixel perfect\b/gi, "detailed")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "");
}

function cleanPersianText(text: string) {
  const cleaned = text
    .replace(/پیکسل[- ]پرفکت/g, "دقیق")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "");

  return normalizeTechnologyNames(cleaned);
}

function cleanProjectOutput(project: ProjectOutput): ProjectOutput {
  const uniqueTechnologies = new Map<string, TechnologyOutput>();

  for (const technology of project.technologies) {
    const name = normalizeTechnologyNames(technology.name.trim());

    const description = cleanEnglishText(technology.description);

    if (!name) {
      continue;
    }

    const key = name.toLowerCase();

    if (!uniqueTechnologies.has(key)) {
      uniqueTechnologies.set(key, {
        name,
        description,
      });
    }
  }

  return {
    title: {
      en: cleanEnglishText(project.title.en),
      fa: cleanPersianText(project.title.fa),
    },

    slug: normalizeSlug(project.slug),

    description: {
      en: cleanEnglishText(project.description.en),
      fa: cleanPersianText(project.description.fa),
    },

    technologies: [...uniqueTechnologies.values()],

    github: project.github.trim(),
    demo: project.demo.trim(),

    content: {
      overview: {
        en: cleanEnglishText(project.content.overview.en),
        fa: cleanPersianText(project.content.overview.fa),
      },

      challenges: {
        en: cleanEnglishText(project.content.challenges.en),
        fa: cleanPersianText(project.content.challenges.fa),
      },

      outcome: {
        en: cleanEnglishText(project.content.outcome.en),
        fa: cleanPersianText(project.content.outcome.fa),
      },
    },
  };
}

function getForbiddenPromotionalPhrase(text: string) {
  const normalized = text.toLowerCase();

  for (const phrase of forbiddenPromotionalPhrases) {
    const lowerPhrase = phrase.toLowerCase();
    if (/[\u0600-\u06ff]/.test(phrase)) {
      if (normalized.includes(lowerPhrase)) {
        return phrase;
      }
    } else {
      const regex = new RegExp(
        `\\b${lowerPhrase.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`,
        "i",
      );
      if (regex.test(normalized)) {
        return phrase;
      }
    }
  }

  return null;
}

function removeUrls(text: string) {
  return text.replace(/https?:\/\/[^\s]+/gi, "");
}

function extractTechnicalTermsFromReadme(readmeText: string): string[] {
  const terms = new Set<string>();

  const backtickMatches = readmeText.match(/`([^`\n]+)`/g) ?? [];
  for (const m of backtickMatches) {
    const raw = m.slice(1, -1).trim();
    if (raw.length > 1 && raw.length < 50) {
      terms.add(raw);
      raw.split(/[^a-zA-Z0-9]+/).forEach((p) => {
        if (p.length > 1) terms.add(p);
      });
    }
  }

  const hyphenMatches = readmeText.match(/\b[A-Za-z]+-[A-Za-z0-9-]+\b/g) ?? [];
  for (const h of hyphenMatches) {
    if (h.length > 2 && h.length < 40) {
      terms.add(h);
    }
  }

  const camelMatches = readmeText.match(/\b[a-zA-Z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g) ?? [];
  for (const c of camelMatches) {
    if (c.length > 2 && c.length < 50) {
      terms.add(c);
    }
  }

  const fileMatches = readmeText.match(/\b[A-Za-z0-9_-]+\.(?:js|ts|jsx|tsx|css|html|json)\b/g) ?? [];
  for (const f of fileMatches) {
    terms.add(f);
  }

  return [...terms];
}

function removeApprovedLatinTerms(
  text: string,
  dynamicTerms: Iterable<string> = [],
) {
  let result = text;

  const allTerms = new Set([...allowedPersianLatinTerms, ...dynamicTerms]);

  const terms = [...allTerms]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const term of terms) {
    const escaped = term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    result = result.replace(regex, " ");
  }

  return result;
}

function containsBrokenMixedWord(
  text: string,
  dynamicTerms: Iterable<string> = [],
) {
  const withoutUrls = removeUrls(text);
  const withoutApprovedTerms = removeApprovedLatinTerms(withoutUrls, dynamicTerms);

  return /[\u0600-\u06ff][A-Za-z]|[A-Za-z][\u0600-\u06ff]/.test(
    withoutApprovedTerms,
  );
}

function getUnapprovedLatinSequences(
  text: string,
  dynamicTerms: Iterable<string> = [],
) {
  const withoutUrls = removeUrls(text);
  const withoutApproved = removeApprovedLatinTerms(withoutUrls, dynamicTerms);

  const rawMatches = withoutApproved.match(/[A-Za-z][A-Za-z0-9.+#-]*/g) ?? [];

  const lowerApproved = new Set(
    [...allowedPersianLatinTerms, ...dynamicTerms].map((t) => t.toLowerCase()),
  );

  return rawMatches
    .map((term) => term.replace(/[.,:;!?-]+$/, ""))
    .filter((term) => {
      if (!term || term.length <= 1) return false;
      return !lowerApproved.has(term.toLowerCase());
    });
}

function containsUnapprovedLatinSequence(
  text: string,
  dynamicTerms: Iterable<string> = [],
) {
  return getUnapprovedLatinSequences(text, dynamicTerms).length > 0;
}

function getUnexpectedLatinTerm(
  text: string,
  dynamicTerms: Iterable<string> = [],
) {
  return getUnapprovedLatinSequences(text, dynamicTerms)[0] ?? null;
}

function validateEnglishText(text: string, fieldName: string) {
  if (!text.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  const forbiddenPhrase = getForbiddenPromotionalPhrase(text);

  if (forbiddenPhrase) {
    throw new Error(
      `${fieldName} contains unsupported promotional language: "${forbiddenPhrase}".`,
    );
  }
}

function validatePersianText(
  text: string,
  fieldName: string,
  dynamicTerms: Iterable<string> = [],
) {
  if (!text.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  const forbiddenPhrase = getForbiddenPromotionalPhrase(text);

  if (forbiddenPhrase) {
    throw new Error(
      `${fieldName} contains unsupported promotional language: "${forbiddenPhrase}".`,
    );
  }

  if (containsBrokenMixedWord(text, dynamicTerms)) {
    console.warn(
      `[AI Validation Warning] ${fieldName} contains a potential mixed Persian/Latin word. Permitting for CMS draft review.`,
    );
  }

  if (containsUnapprovedLatinSequence(text, dynamicTerms)) {
    const unexpectedTerm = getUnexpectedLatinTerm(text, dynamicTerms);

    console.warn(
      `[AI Validation Warning] ${fieldName} contains technical term (${unexpectedTerm}). Permitting for CMS draft review.`,
    );
  }
}

function validateProjectOutput(
  project: ProjectOutput,
  dynamicTerms: Iterable<string> = [],
) {
  validateEnglishText(project.title.en, "English title");

  validatePersianText(project.title.fa, "Persian title", dynamicTerms);

  validateEnglishText(project.description.en, "English description");

  validatePersianText(project.description.fa, "Persian description", dynamicTerms);

  validateEnglishText(project.content.overview.en, "English overview");

  validatePersianText(project.content.overview.fa, "Persian overview", dynamicTerms);

  validateEnglishText(project.content.challenges.en, "English challenges");

  validatePersianText(
    project.content.challenges.fa,
    "Persian challenges",
    dynamicTerms,
  );

  validateEnglishText(project.content.outcome.en, "English outcome");

  validatePersianText(project.content.outcome.fa, "Persian outcome", dynamicTerms);

  if (!project.github.trim()) {
    throw new Error("GitHub URL is required.");
  }

  if (!project.technologies.length) {
    throw new Error("At least one technology is required.");
  }

  for (const technology of project.technologies) {
    if (!technology.name.trim()) {
      throw new Error("Technology names cannot be empty.");
    }

    if (!technology.description.trim()) {
      throw new Error(
        `Technology description is required for "${technology.name}".`,
      );
    }
  }
}

function repairJson(jsonStr: string): string {
  let repaired = jsonStr.trim();

  if (repaired.startsWith("```")) {
    repaired = repaired
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  // 1. Fix accidental `]` closing an object before final `}`: e.g. `}\s*]\s*}`
  repaired = repaired.replace(/}\s*\]\s*}([\s,;]*)$/, "}\n  }\n}$1");

  // 2. Remove trailing commas before `}` or `]`
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");

  // 3. If root starts with `{` but ends with `]`, fix the closing
  if (repaired.startsWith("{") && /\]\s*$/.test(repaired)) {
    repaired = repaired.replace(/\]\s*$/, "}");
  }

  return repaired;
}

function parseAiJson(content: string): ProjectOutput {
  let cleaned = content.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (initialError) {
    try {
      const repaired = repairJson(cleaned);
      parsed = JSON.parse(repaired);
    } catch {
      throw initialError;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response is not a valid project object.");
  }

  const project = parsed as Record<string, unknown>;

  const title = project.title as Record<string, unknown> | undefined;

  const description = project.description as
    Record<string, unknown> | undefined;

  const contentObject = project.content as Record<string, unknown> | undefined;

  const overview = contentObject?.overview as
    Record<string, unknown> | undefined;

  const challenges = contentObject?.challenges as
    Record<string, unknown> | undefined;

  const outcome = contentObject?.outcome as Record<string, unknown> | undefined;

  if (!title || typeof title.en !== "string" || typeof title.fa !== "string") {
    throw new Error("AI response contains an invalid title.");
  }

  if (
    !description ||
    typeof description.en !== "string" ||
    typeof description.fa !== "string"
  ) {
    throw new Error("AI response contains an invalid description.");
  }

  if (
    !Array.isArray(project.technologies) ||
    !project.technologies.every(
      (technology) =>
        technology &&
        typeof technology === "object" &&
        "name" in technology &&
        "description" in technology &&
        typeof technology.name === "string" &&
        typeof technology.description === "string",
    )
  ) {
    throw new Error("AI response contains invalid technologies.");
  }

  if (typeof project.github !== "string") {
    throw new Error("AI response contains an invalid GitHub URL.");
  }

  if (typeof project.demo !== "string") {
    throw new Error("AI response contains an invalid demo URL.");
  }

  if (
    !overview ||
    typeof overview.en !== "string" ||
    typeof overview.fa !== "string"
  ) {
    throw new Error("AI response contains an invalid overview.");
  }

  if (
    !challenges ||
    typeof challenges.en !== "string" ||
    typeof challenges.fa !== "string"
  ) {
    throw new Error("AI response contains invalid challenges.");
  }

  if (
    !outcome ||
    typeof outcome.en !== "string" ||
    typeof outcome.fa !== "string"
  ) {
    throw new Error("AI response contains an invalid outcome.");
  }

  return {
    title: {
      en: title.en,
      fa: title.fa,
    },

    slug: typeof project.slug === "string" ? project.slug : title.en,

    description: {
      en: description.en,
      fa: description.fa,
    },

    technologies: project.technologies as TechnologyOutput[],

    github: project.github,
    demo: project.demo,

    content: {
      overview: {
        en: overview.en,
        fa: overview.fa,
      },

      challenges: {
        en: challenges.en,
        fa: challenges.fa,
      },

      outcome: {
        en: outcome.en,
        fa: outcome.fa,
      },
    },
  };
}

const systemPrompt = `
You generate portfolio project content from GitHub repository evidence.

Your output MUST be valid JSON with exactly this structure:

{
  "title": {
    "en": "string",
    "fa": "string"
  },
  "slug": "string",
  "description": {
    "en": "string",
    "fa": "string"
  },
  "technologies": [
    {
      "name": "string",
      "description": "string"
    }
  ],
  "github": "string",
  "demo": "string",
  "content": {
    "overview": {
      "en": "string",
      "fa": "string"
    },
    "challenges": {
      "en": "string",
      "fa": "string"
    },
    "outcome": {
      "en": "string",
      "fa": "string"
    }
  }
}

IMPORTANT:

Return ONLY the JSON object.

Do not return:
- explanations
- safety messages
- status messages
- markdown
- code fences
- comments
- "User Safety"
- "safe"
- "unsafe"

EVIDENCE RULES:

- Use only information supported by the supplied repository evidence.
- Do not invent features, architecture, libraries, deployment platforms,
  implementation details, or technical challenges.
- Prefer repository metadata, package.json, README content, and explicit
  source/project-structure evidence.
- If evidence is insufficient, leave the claim out.
- Do not treat promotional README language as objective evidence.
- Do not copy marketing language from the README.
- Do not make subjective judgments about the project.

IMPORTANT NEUTRAL-WRITING RULE:

Every generated field must be factual, descriptive, and neutral.

Do NOT use promotional or subjective wording.

Never use:

best
amazing
awesome
beautiful
excellent
perfect
powerful
professional
high-quality
high quality
seamless
stunning
impressive
outstanding
pixel-perfect
pixel perfect

In Persian, never use promotional words such as:
بهترین
عالی
فوق‌العاده
حرفه‌ای
بی‌نظیر
قدرتمند

LANGUAGE RULES:

- English fields must be natural English.
- Persian fields must be natural Persian.
- Persian prose should remain Persian.
- Technology names must remain in canonical English form.
- NEVER translate or transliterate technology names into Persian.

Correct Persian:

"این پروژه با React و CSS3 ساخته شده است."

Incorrect Persian:

"این پروژه با ری‌اکت و سی‌اس‌اس۳ ساخته شده است."

TECHNOLOGIES:

- Return canonical English technology names.
- Do not translate technology names.
- Only include technologies supported by repository evidence.
- Prefer package.json dependencies and explicit source/project-structure evidence.
- Do not include a technology merely because it is mentioned casually.
- Do not duplicate technologies.

For EVERY technology, also provide a short factual English
description explaining what the technology is.

Example:

{
  "name": "React",
  "description": "A JavaScript library for building user interfaces."
}

The technology description must:

- be factual and neutral
- be concise
- describe the technology itself
- not describe how impressive the project is
- not claim that the project uses a feature unless repository evidence supports it

TITLE:

- The title must represent the actual project name or concept (e.g. "Apple Website Clone").
- The Persian title must be an accurate, direct translation of the project title (e.g. "کلون وب‌سایت Apple" or "کلون وب‌سایت اپل").
- NEVER include the author's name, username, portfolio name, or contact website in the title (e.g. do NOT include "Quantic Machines", "کلیکوماشین", or personal portfolio branding).
- Keep the title concise and professional.

DESCRIPTION:

- Describe what the project is.
- Keep the description factual.
- Do not use promotional language.
- Do not repeat subjective claims from the README.
- Prefer observable technologies, project type, and functionality.

CHALLENGES:

- Describe concrete implementation challenges supported by evidence.
- Base them on evidence such as responsive CSS, media queries,
  component structure, JavaScript interactions, Three.js files,
  state management, routing, or other explicit evidence.
- Do not invent challenges.
- Do not call challenges "difficult", "complex", or "challenging"
  unless the repository evidence explicitly supports that claim.

OUTCOME:

- Describe observable project results or included functionality.
- Do not claim performance improvements without evidence.
- Do not claim testing without testing evidence.
- Do not claim production readiness.
- Do not use promotional language.

SLUG:

- Use lowercase English words separated by hyphens.
- Do not use Persian characters.

GITHUB:

- Use the supplied repository URL exactly.

DEMO:

- Use the supplied homepage/demo URL when available.
- Otherwise return an empty string.

PERSIAN MIXED-LANGUAGE RULE:

Canonical technical terms such as React, CSS3, JavaScript,
Three.js, GSAP, Netlify, and GitHub are allowed inside
Persian sentences.

For example:

"این پروژه با React و CSS3 ساخته شده است."

FINAL SELF-CHECK:

Before returning JSON:

1. Verify every claim is supported by repository evidence.
2. Verify English text contains no promotional language.
3. Verify Persian text contains no promotional language.
4. Verify approved technical terms may appear naturally in Persian.
5. Verify technology names remain canonical English.
6. Verify technologies are supported by evidence.
7. Verify every technology has a factual English description.
8. Verify the JSON structure is exactly correct.
9. Return JSON only.
`.trim();

async function requestGemini(
  repository: unknown,
  readme: string,
  packageJson: unknown,
): Promise<string> {
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
                  text: JSON.stringify({
                    repository,
                    readme,
                    packageJson,
                  }),
                },
              ],
            },
          ],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        })
      );

      const text = response.text;
      if (text) {
        return text;
      }
    } catch (err) {
      console.warn(`Gemini generation with model ${model} failed, trying next candidate:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("Gemini returned an empty response.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !body.repository ||
      typeof body.readme !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "GitHub repository data is required.",
        },
        {
          status: 400,
        },
      );
    }

    const repository = body.repository;
    const rawReadme = typeof body.readme === "string" ? body.readme : "";
    // Truncate overly long READMEs to 12,000 characters to prevent excessive generation latency
    const readme =
      rawReadme.length > 12000
        ? rawReadme.slice(0, 12000) + "\n\n[...truncated for brevity...]"
        : rawReadme;
    const packageJson = body.packageJson ?? null;

    let aiContent: string;

    try {
      aiContent = await requestGemini(repository, readme, packageJson);
    } catch (error) {
      console.error("Gemini AI generation failed:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Gemini AI generation request failed.",
          error:
            error instanceof Error
              ? error.message
              : "Unknown Gemini generation error.",
        },
        {
          status: 502,
        },
      );
    }

    let project: ProjectOutput;

    try {
      project = parseAiJson(aiContent);
    } catch (error) {
      console.error("AI JSON parsing error:", error);

      console.error("AI raw content:", aiContent);

      return NextResponse.json(
        {
          success: false,
          message: "AI returned invalid project data.",
          error:
            error instanceof Error
              ? error.message
              : "Unknown JSON parsing error.",
          rawContent: aiContent,
        },
        {
          status: 500,
        },
      );
    }

    const cleanedProject = cleanProjectOutput(project);

    console.log("GENERATED PROJECT DRAFT:", JSON.stringify(cleanedProject, null, 2));

    const dynamicTerms = new Set<string>();

    if (repository && typeof repository === "object") {
      const repoObj = repository as Record<string, unknown>;
      if (typeof repoObj.name === "string") {
        dynamicTerms.add(repoObj.name);
        repoObj.name.split(/[^a-zA-Z0-9]+/).forEach((t) => {
          if (t.length > 1) dynamicTerms.add(t);
        });
      }
      if (typeof repoObj.description === "string") {
        repoObj.description.split(/[^a-zA-Z0-9]+/).forEach((t) => {
          if (t.length > 1) dynamicTerms.add(t);
        });
      }
      if (Array.isArray(repoObj.topics)) {
        repoObj.topics.forEach((topic) => {
          if (typeof topic === "string") {
            dynamicTerms.add(topic);
            topic.split(/[^a-zA-Z0-9]+/).forEach((t) => {
              if (t.length > 1) dynamicTerms.add(t);
            });
          }
        });
      }
    }

    if (cleanedProject.title.en) {
      cleanedProject.title.en.split(/[^a-zA-Z0-9]+/).forEach((t) => {
        if (t.length > 1) dynamicTerms.add(t);
      });
    }

    if (Array.isArray(cleanedProject.technologies)) {
      for (const t of cleanedProject.technologies) {
        if (t.name) {
          dynamicTerms.add(t.name);
          t.name.split(/[^a-zA-Z0-9]+/).forEach((sub) => {
            if (sub.length > 1) dynamicTerms.add(sub);
          });
        }
      }
    }

    if (typeof readme === "string") {
      const technicalReadmeTerms = extractTechnicalTermsFromReadme(readme);
      for (const term of technicalReadmeTerms) {
        dynamicTerms.add(term);
      }
    }

    if (packageJson && typeof packageJson === "object") {
      const pkg = packageJson as Record<string, unknown>;
      for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
        const deps = pkg[section];
        if (deps && typeof deps === "object") {
          for (const depName of Object.keys(deps)) {
            dynamicTerms.add(depName);
            depName.split(/[^a-zA-Z0-9]+/).forEach((part) => {
              if (part.length > 1) dynamicTerms.add(part);
            });
          }
        }
      }
    }

    try {
      validateProjectOutput(cleanedProject, dynamicTerms);
    } catch (error) {
      console.error("AI project validation error:", error);

      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Generated project data failed validation.",
        },
        {
          status: 422,
        },
      );
    }

    const draft = await createProjectDraft(cleanedProject);

    return NextResponse.json({
      success: true,

      project: cleanedProject,

      draft: {
        id: draft._id,
        message: "Database draft created successfully.",
      },
    });
  } catch (error) {
    console.error("AI project generation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to generate the project.",
      },
      {
        status: 500,
      },
    );
  }
}
