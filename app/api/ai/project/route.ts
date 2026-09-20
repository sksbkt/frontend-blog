import { NextResponse } from "next/server";

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

type ProjectOutput = {
  title: LocalizedText;
  slug: string;
  description: LocalizedText;
  technologies: string[];
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
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "");
}

function cleanPersianText(text: string) {
  const cleaned = text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "");

  return normalizeTechnologyNames(cleaned);
}

function cleanProjectOutput(project: ProjectOutput): ProjectOutput {
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

    technologies: [
      ...new Set(
        project.technologies
          .map((technology) => normalizeTechnologyNames(technology.trim()))
          .filter(Boolean),
      ),
    ],

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

  return (
    forbiddenPromotionalPhrases.find((phrase) =>
      normalized.includes(phrase.toLowerCase()),
    ) ?? null
  );
}

function removeUrls(text: string) {
  return text.replace(/https?:\/\/[^\s]+/gi, "");
}

function removeApprovedLatinTerms(text: string) {
  let result = text;

  const terms = [...allowedPersianLatinTerms].sort(
    (a, b) => b.length - a.length,
  );

  for (const term of terms) {
    result = result.replaceAll(term, " ");
  }

  return result;
}

function containsBrokenMixedWord(text: string) {
  const withoutUrls = removeUrls(text);

  const withoutApprovedTerms = removeApprovedLatinTerms(withoutUrls);

  return /[\u0600-\u06ff][A-Za-z]|[A-Za-z][\u0600-\u06ff]/.test(
    withoutApprovedTerms,
  );
}

function containsUnapprovedLatinSequence(text: string) {
  const withoutUrls = removeUrls(text);

  const latinSequences = withoutUrls.match(/[A-Za-z][A-Za-z0-9.+#-]*/g) ?? [];

  return latinSequences.some(
    (sequence) => !allowedPersianLatinTerms.has(sequence),
  );
}

function getUnexpectedLatinTerm(text: string) {
  const withoutUrls = removeUrls(text);

  const latinSequences = withoutUrls.match(/[A-Za-z][A-Za-z0-9.+#-]*/g) ?? [];

  return (
    latinSequences.find(
      (sequence) => !allowedPersianLatinTerms.has(sequence),
    ) ?? null
  );
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

function validatePersianText(text: string, fieldName: string) {
  if (!text.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  const forbiddenPhrase = getForbiddenPromotionalPhrase(text);

  if (forbiddenPhrase) {
    throw new Error(
      `${fieldName} contains unsupported promotional language: "${forbiddenPhrase}".`,
    );
  }

  if (containsBrokenMixedWord(text)) {
    throw new Error(
      `${fieldName} contains an invalid mixed Persian/Latin word.`,
    );
  }

  if (containsUnapprovedLatinSequence(text)) {
    const unexpectedTerm = getUnexpectedLatinTerm(text);

    throw new Error(
      `${fieldName} contains an unapproved technical term${
        unexpectedTerm ? `: ${unexpectedTerm}` : ""
      }.`,
    );
  }
}

function validateProjectOutput(project: ProjectOutput) {
  validateEnglishText(project.title.en, "English title");

  validatePersianText(project.title.fa, "Persian title");

  validateEnglishText(project.description.en, "English description");

  validatePersianText(project.description.fa, "Persian description");

  validateEnglishText(project.content.overview.en, "English overview");

  validatePersianText(project.content.overview.fa, "Persian overview");

  validateEnglishText(project.content.challenges.en, "English challenges");

  validatePersianText(project.content.challenges.fa, "Persian challenges");

  validateEnglishText(project.content.outcome.en, "English outcome");

  validatePersianText(project.content.outcome.fa, "Persian outcome");

  if (!project.github.trim()) {
    throw new Error("GitHub URL is required.");
  }

  if (!project.technologies.length) {
    throw new Error("At least one technology is required.");
  }

  for (const technology of project.technologies) {
    if (!technology.trim()) {
      throw new Error("Technology names cannot be empty.");
    }
  }
}

function parseAiJson(content: string): ProjectOutput {
  let cleaned = content.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  const parsed = JSON.parse(cleaned) as unknown;

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
    !project.technologies.every((technology) => typeof technology === "string")
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

    technologies: project.technologies as string[],

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

function extractAiContent(data: unknown) {
  const response = data as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };

  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (
          item &&
          typeof item === "object" &&
          "text" in item &&
          typeof item.text === "string"
        ) {
          return item.text;
        }

        return "";
      })
      .join("");
  }

  throw new Error("OpenRouter returned an unsupported response.");
}

function isNonJsonSafetyResponse(content: string) {
  const normalized = content.trim().toLowerCase();

  return (
    normalized === "user safety: safe" || normalized.startsWith("user safety:")
  );
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
  "technologies": ["string"],
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

If a sentence sounds like marketing copy,
rewrite it as a factual description.

BAD:

"This project is a powerful and professional Apple clone."

GOOD:

"This project is an Apple website clone implemented with React,
CSS3, SVG, and JavaScript."

LANGUAGE RULES:

- English fields must be natural English.
- Persian fields must be natural Persian.
- Persian prose should remain Persian.
- Technology names must remain in canonical English form.
- NEVER translate or transliterate technology names into Persian.

Canonical technology names include:

React
React DOM
Next.js
TypeScript
JavaScript
CSS
CSS3
HTML
HTML5
Tailwind CSS
Node.js
Express
Three.js
Vite
Create React App
GSAP
Netlify
Vercel
Sanity
GitHub
SVG
WebGL
Sentry
Redux
Zustand
Firebase
MongoDB
PostgreSQL
MySQL
Prisma
Supabase
Framer Motion

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
7. Verify the JSON structure is exactly correct.
8. Return JSON only.

Do not wrap the JSON in markdown fences.
`.trim();

async function requestOpenRouter(
  model: string,
  repository: unknown,
  readme: string,
  packageJson: unknown,
) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model,

        response_format: {
          type: "json_object",
        },

        messages: [
          {
            role: "system",
            content: systemPrompt,
          },

          {
            role: "user",
            content: JSON.stringify({
              repository,
              readme,
              packageJson,
            }),
          },
        ],
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `OpenRouter request failed with status ${response.status}: ${JSON.stringify(data)}`,
    );
  }

  return extractAiContent(data);
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

    const readme = body.readme;

    const packageJson = body.packageJson ?? null;

    /*
     * First attempt:
     *
     * Use OpenRouter's free router.
     */
    let aiContent: string;

    try {
      aiContent = await requestOpenRouter(
        "openrouter/free",
        repository,
        readme,
        packageJson,
      );
    } catch (error) {
      console.error("OpenRouter first attempt failed:", error);

      return NextResponse.json(
        {
          success: false,
          message: "OpenRouter request failed.",
          error:
            error instanceof Error
              ? error.message
              : "Unknown OpenRouter error.",
        },
        {
          status: 502,
        },
      );
    }

    /*
     * The free router can route to different models.
     *
     * If a provider returns a safety/status string
     * instead of JSON, try one more free model.
     */
    if (isNonJsonSafetyResponse(aiContent)) {
      console.warn(
        "OpenRouter free router returned a non-JSON safety response. Retrying with a structured-output free model.",
      );

      try {
        aiContent = await requestOpenRouter(
          "google/gemma-4-26b-a4b-it:free",
          repository,
          readme,
          packageJson,
        );
      } catch (error) {
        console.error("OpenRouter fallback attempt failed:", error);

        return NextResponse.json(
          {
            success: false,
            message:
              "OpenRouter returned a non-JSON response and the fallback model failed.",
            error:
              error instanceof Error
                ? error.message
                : "Unknown fallback error.",
            rawContent: aiContent,
          },
          {
            status: 502,
          },
        );
      }
    }

    /*
     * If the fallback also returns a safety/status
     * message, do not send it to JSON.parse().
     */
    if (isNonJsonSafetyResponse(aiContent)) {
      console.error(
        "OpenRouter returned a non-JSON safety response:",
        aiContent,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "OpenRouter returned a safety/status message instead of project JSON.",
          rawContent: aiContent,
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

    try {
      validateProjectOutput(cleanedProject);
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

    /*
     * Only create the Sanity draft after:
     *
     * 1. OpenRouter succeeds
     * 2. Response is JSON
     * 3. JSON structure is valid
     * 4. Content passes validation
     */
    const draft = await createProjectDraft(cleanedProject);

    return NextResponse.json({
      success: true,

      project: cleanedProject,

      draft: {
        id: draft._id,
        message: "Sanity draft created successfully.",
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
