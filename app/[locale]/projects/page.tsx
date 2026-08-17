import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ProjectCard from "@/components/projects/project-card";
import { projects } from "@/lib/data/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "A collection of projects I've built.",
};
type ProjectsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};
export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "projects",
  });

  return (
    <main className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <header className="max-w-3xl">
          <span className="text-sm font-medium uppercase tracking-widest text-primary">
            {t("label")}
          </span>

          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            {t("title")}
          </h1>

          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            {t("description")}
          </p>
        </header>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
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
