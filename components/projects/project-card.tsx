import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Project } from "@/types/project";

type ProjectCardProps = {
  project: Project;
};

export default async function ProjectCard({ project }: ProjectCardProps) {
  const locale = await getLocale();
  const t = await getTranslations("projects.card");

  const language = locale === "fa" ? "fa" : "en";

  return (
    <article className="group relative overflow-hidden rounded-xl border bg-card transition-shadow duration-300 hover:shadow-lg">
      <Link
        href={`/projects/${project.slug}`}
        className="block"
      >
        <div className="relative h-56 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={project.image}
              alt={project.title[language]}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="scale-[1.01] object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
        </div>

        <div className="-mt-8 relative z-10 p-6">
          <h3 className="text-xl font-semibold transition-colors group-hover:text-primary">
            {project.title[language]}
          </h3>

          <p className="mt-3 leading-7 text-muted-foreground">
            {project.description[language]}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {project.technologies.map((technology) => (
              <span
                key={technology}
                className="rounded-full bg-muted px-3 py-1 text-xs"
              >
                {technology}
              </span>
            ))}
          </div>
        </div>
      </Link>

      <div className="relative z-10 flex gap-3 px-6 pb-6">
        {project.demo && (
          <a
            href={project.demo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium leading-none hover:underline"
          >
            <span>{t("demo")}</span>

            <ArrowRight className="size-4 shrink-0 -translate-y-px rtl:rotate-180" />
          </a>
        )}

        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground hover:text-primary"
          >
            {t("github")}
          </a>
        )}
      </div>
    </article>
  );
}
