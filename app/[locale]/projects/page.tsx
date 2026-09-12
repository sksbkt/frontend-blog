import { getTranslations } from "next-intl/server";

import ProjectCard from "@/components/projects/project-card";
import { client } from "@/lib/sanity/client";
import { mapSanityProject } from "@/lib/sanity/mappers";
import { projectsQuery } from "@/lib/sanity/queries";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const t = await getTranslations("projects");

  const sanityProjects: Parameters<typeof mapSanityProject>[0][] =
    await client.fetch(projectsQuery);

  const projects = sanityProjects.map(mapSanityProject);

  return (
    <main className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-3xl">
          <span className="text-sm font-medium uppercase tracking-widest text-primary">
            {t("label")}
          </span>

          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            {t("title")}
          </h1>

          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
