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

export const projectsQuery = `*[
  _type == "project" &&
  (
    count($technologies) == 0 ||
    count(technologies[@ in $technologies]) > 0
  )
] | order(_createdAt desc) [$start...$end] {
  _id,
  title,
  slug,
  description,
  image,
  technologies,
  github,
  demo,
  featured,
  content
}`;

export const projectFilterTechnologiesQuery = `{
  "allTechnologies": array::unique(
    *[_type == "project"].technologies[@ != "" && defined(@)]
  ),
  "matchingTechnologies": *[
    _type == "project" &&
    (
      count($technologies) == 0 ||
      count(technologies[@ in $technologies]) > 0
    )
  ].technologies[@ != "" && defined(@)]
}`;
