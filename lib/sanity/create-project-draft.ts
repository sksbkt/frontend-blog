import { writeClient } from "@/lib/sanity/write-client";

type LocalizedText = {
  en: string;
  fa: string;
};

type ProjectDraftInput = {
  title: LocalizedText;
  slug: string;
  description: LocalizedText;
  technologies: string[];
  github: string;
  demo: string;
  content: {
    overview: LocalizedText;
    challenges: LocalizedText;
    outcome: LocalizedText;
  };
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTechnologies(technologies: string[]) {
  return [
    ...new Set(
      technologies.map((technology) => technology.trim()).filter(Boolean),
    ),
  ];
}

function validateProject(project: ProjectDraftInput) {
  if (!project.title.en.trim() || !project.title.fa.trim()) {
    throw new Error("Project title is required.");
  }

  if (!project.description.en.trim() || !project.description.fa.trim()) {
    throw new Error("Project description is required.");
  }

  if (!project.github.trim()) {
    throw new Error("GitHub URL is required.");
  }

  if (project.technologies.length === 0) {
    throw new Error("At least one technology is required.");
  }

  if (
    !project.content.overview.en.trim() ||
    !project.content.overview.fa.trim()
  ) {
    throw new Error("Project overview is required.");
  }

  if (
    !project.content.challenges.en.trim() ||
    !project.content.challenges.fa.trim()
  ) {
    throw new Error("Project challenges are required.");
  }

  if (
    !project.content.outcome.en.trim() ||
    !project.content.outcome.fa.trim()
  ) {
    throw new Error("Project outcome is required.");
  }
}

function getGitHubSocialImageUrl(githubUrl: string) {
  const url = new URL(githubUrl);

  if (url.hostname !== "github.com") {
    throw new Error("Invalid GitHub URL.");
  }

  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length < 2) {
    throw new Error("Invalid GitHub repository URL.");
  }

  const owner = parts[0];
  const repository = parts[1].replace(/\.git$/, "");

  return `https://opengraph.githubassets.com/1/${owner}/${repository}`;
}

async function uploadProjectImage(githubUrl: string, title: string) {
  const imageUrl = getGitHubSocialImageUrl(githubUrl);

  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to download GitHub project image: ${response.status}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "image/png";

  const imageBuffer = Buffer.from(await response.arrayBuffer());

  const asset = await writeClient.assets.upload("image", imageBuffer, {
    filename: `${title.toLowerCase().replace(/\s+/g, "-")}.png`,
    contentType,
  });

  return {
    _type: "image",
    asset: {
      _type: "reference",
      _ref: asset._id,
    },
    alt: title,
  };
}

export async function createProjectDraft(project: ProjectDraftInput) {
  const normalizedProject = {
    ...project,
    slug: normalizeSlug(project.slug),
    technologies: normalizeTechnologies(project.technologies),
  };

  validateProject(normalizedProject);

  const draftId = `drafts.${crypto.randomUUID()}`;

  const image = await uploadProjectImage(
    normalizedProject.github,
    normalizedProject.title.en,
  );

  return writeClient.create({
    _id: draftId,
    _type: "project",

    title: normalizedProject.title,

    slug: {
      _type: "slug",
      current: normalizedProject.slug,
    },

    description: normalizedProject.description,

    image,

    technologies: normalizedProject.technologies,

    github: normalizedProject.github,

    demo: normalizedProject.demo || "",

    featured: false,

    content: normalizedProject.content,
  });
}
