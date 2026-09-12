import { getTranslations } from "next-intl/server";

import ProjectCard from "@/components/projects/project-card";
import { client } from "@/lib/sanity/client";
import { mapSanityProject } from "@/lib/sanity/mappers";

const featuredProjectsQuery = `*[
  _type == "project" &&
  featured == true
] | order(_createdAt desc) {
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

export const dynamic = "force-dynamic";

export default async function FeaturedProjects() {
  const t = await getTranslations("projects");

  const sanityProjects: Parameters<typeof mapSanityProject>[0][] =
    await client.fetch(featuredProjectsQuery);

  const featuredProjects = sanityProjects.map(mapSanityProject);

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="text-sm font-medium uppercase tracking-widest text-primary">
              {t("featured.label")}
            </span>

            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              {t("featured.title")}
            </h2>

            <p className="mt-3 max-w-2xl text-muted-foreground">
              {t("featured.description")}
            </p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {featuredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
