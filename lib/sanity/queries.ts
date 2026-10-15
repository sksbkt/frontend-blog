import { client, safeFetch } from "./client";

export const postsQuery = `*[
  _type == "post"
] | order(publishedAt desc) [$start...$end] {
  _id,
  title,
  slug,
  excerpt,
  coverImage,
  publishedAt,
  readingTime,
  tags,
  featured,
  body
}`;

export const allProjectsQuery = `*[
  _type == "project"
] | order(_createdAt desc) {
  _id,
  title,
  slug,
  description,
  image,
  coverImage,
  gallery,
  video,
  previewGif,
  technologies,
  github,
  demo,
  featured,
  content,
  aiContextDigest,
  rawLanguages,
  "languages": languages[]{
    _key,
    name,
    percentage,
    color,
    bytes
  }
}`;

export const projectsQuery = `*[
  _type == "project" &&
  (
    count($technologies) == 0 ||
    count(technologies[@ in $technologies]) == count($technologies)
  )
] | order(_createdAt desc) [$start...$end] {
  _id,
  title,
  slug,
  description,
  image,
  coverImage,
  gallery,
  video,
  previewGif,
  technologies,
  github,
  demo,
  featured,
  content,
  aiContextDigest,
  rawLanguages,
  "languages": languages[]{
    _key,
    name,
    percentage,
    color,
    bytes
  }
}`;

export const projectBySlugQuery = `*[
  _type == "project" &&
  slug.current == $slug
][0] {
  _id,
  title,
  slug,
  description,
  image,
  coverImage,
  gallery,
  video,
  previewGif,
  technologies,
  github,
  demo,
  featured,
  content,
  aiContextDigest,
  rawLanguages,
  "languages": languages[]{
    _key,
    name,
    percentage,
    color,
    bytes
  }
}`;

export const projectFilterTechnologiesQuery = `{
  "totalMatching": count(*[
    _type == "project" &&
    (
      count($technologies) == 0 ||
      count(technologies[@ in $technologies]) == count($technologies)
    )
  ]),
  "allTechnologies": array::unique(
    *[_type == "project"].technologies[@ != "" && defined(@)]
  ),
  "matchingTechnologies": *[
    _type == "project" &&
    (
      count($technologies) == 0 ||
      count(technologies[@ in $technologies]) == count($technologies)
    )
  ].technologies[@ != "" && defined(@)]
}`;

/**
 * Fetch all published projects with Next.js Cache Tag 'projects' and indefinite lifetime
 */
export async function getProjects() {
  return safeFetch(
    () =>
      client.fetch(
        allProjectsQuery,
        {},
        {
          next: {
            tags: ["projects"],
            revalidate: process.env.NODE_ENV === "development" ? 0 : 60,
          },
        }
      ),
    []
  );
}

/**
 * Fetch a single project by slug with global 'projects' and granular 'project:${slug}' tags
 */
export async function getProjectBySlug(slug: string) {
  return safeFetch(
    () =>
      client.fetch(
        projectBySlugQuery,
        { slug },
        {
          next: {
            tags: ["projects", `project:${slug}`],
            revalidate: process.env.NODE_ENV === "development" ? 0 : 60,
          },
        }
      ),
    null
  );
}
