import { NextResponse } from "next/server";

import { createProjectDraft } from "@/lib/sanity/create-project-draft";

type ProjectAiInput = {
  repository: {
    name: string;
    fullName: string;
    description: string | null;
    url: string;
    homepage: string | null;
    language: string | null;
    topics: string[];
  };
  readme: string;
};

type ProjectAiOutput = {
  title: {
    en: string;
    fa: string;
  };
  slug: string;
  description: {
    en: string;
    fa: string;
  };
  technologies: string[];
  github: string;
  demo: string;
  content: {
    overview: {
      en: string;
      fa: string;
    };
    challenges: {
      en: string;
      fa: string;
    };
    outcome: {
      en: string;
      fa: string;
    };
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProjectAiInput;

    if (!body.repository || !body.readme) {
      return NextResponse.json(
        {
          success: false,
          message: "Repository data and README are required.",
        },
        { status: 400 },
      );
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content: `
You generate structured portfolio project data from GitHub repositories.

Return ONLY valid JSON with exactly these fields:

{
  "title": {
    "en": "English project title",
    "fa": "Natural Persian project title"
  },
  "slug": "lowercase-url-friendly-slug",
  "description": {
    "en": "Short professional English description",
    "fa": "Short professional Persian description"
  },
  "technologies": ["technology 1", "technology 2"],
  "github": "GitHub repository URL",
  "demo": "Live demo URL or empty string",
  "content": {
    "overview": {
      "en": "Professional English overview",
      "fa": "Natural Persian overview"
    },
    "challenges": {
      "en": "Professional English description of the main technical challenges",
      "fa": "Natural Persian description of the main technical challenges"
    },
    "outcome": {
      "en": "Professional English description of the project's outcome",
      "fa": "Natural Persian description of the project's outcome"
    }
  }
}

Rules:
- Base everything on the provided repository information.
- Do not invent technologies or project details that are not reasonably supported by the repository.
- Keep the main description concise and suitable for a developer portfolio.
- The overview should explain what the project is and what it does.
- The challenges should describe realistic technical challenges supported by the repository information.
- The outcome should describe the resulting functionality or value supported by the repository information.
- Keep overview, challenges, and outcome reasonably concise.
- The Persian translation must be natural Persian, not word-for-word translation.
- Use established Persian spellings for technology names when appropriate.
  For example, React should be written as "ری‌اکت", not "رکت".
- Use a simple lowercase slug with hyphens.
- Use the repository URL for "github".
- Use the repository homepage for "demo" when it is clearly a real live/demo website.
- If there is no clear live demo, return an empty string for "demo".
- Do not use markdown.
- Do not include explanations outside the JSON.
              `.trim(),
            },
            {
              role: "user",
              content: JSON.stringify({
                repository: body.repository,
                readme: body.readme.slice(0, 20000),
              }),
            },
          ],
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter project error:", data);

      return NextResponse.json(
        {
          success: false,
          message: "OpenRouter project generation failed.",
        },
        { status: response.status },
      );
    }

    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "OpenRouter returned an invalid response.",
        },
        { status: 502 },
      );
    }

    let project: ProjectAiOutput;

    try {
      project = JSON.parse(content) as ProjectAiOutput;
    } catch {
      console.error("Invalid AI JSON:", content);

      return NextResponse.json(
        {
          success: false,
          message: "OpenRouter returned invalid JSON.",
        },
        { status: 502 },
      );
    }

    const draft = await createProjectDraft(project);

    return NextResponse.json({
      success: true,
      project,
      draft: {
        id: draft._id,
        message: "Sanity draft created successfully.",
      },
    });
  } catch (error) {
    console.error("Project AI error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to generate project data.",
      },
      { status: 500 },
    );
  }
}
