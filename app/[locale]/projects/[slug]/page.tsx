import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { projects } from "@/lib/data/projects";
import {
  FaGithub as Github,
  FaExternalLinkAlt as ExternalLink,
} from "react-icons/fa";

type ProjectPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  const t = await getTranslations({
    locale,
    namespace: "projects",
  });

  const project = projects.find((project) => project.slug === slug);

  if (!project) {
    return {
      title: t("page.notFound"),
    };
  }

  const language = locale === "fa" ? "fa" : "en";

  return {
    title: project.title[language],
    description: project.description[language],
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { locale, slug } = await params;

  const t = await getTranslations("projects");

  const project = projects.find((project) => project.slug === slug);

  if (!project) {
    notFound();
  }

  const language = locale === "fa" ? "fa" : "en";

  return (
    <main className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={project.image}
              alt={project.title[language]}
              fill
              priority
              className="object-cover"
            />
          </div>

          <div className="p-6 md:p-10">
            <span className="text-sm font-medium uppercase tracking-widest text-primary">
              {t("page.label")}
            </span>

            <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
              {project.title[language]}
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              {project.description[language]}
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {project.technologies.map((technology) => (
                <span
                  key={technology}
                  className="rounded-full bg-muted px-3 py-1.5 text-sm"
                >
                  {technology}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Github className="size-4" />
                  {t("card.github")}
                </a>
              )}

              {project.demo && (
                <a
                  href={project.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <ExternalLink className="size-4" />
                  {t("card.demo")}
                </a>
              )}
            </div>
          </div>
        </div>

        <section className="mt-16 grid gap-12 md:grid-cols-3">
          <div className="md:col-span-2">
            <span className="text-sm font-medium uppercase tracking-widest text-primary">
              {t("page.about")}
            </span>

            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              {t("page.overview")}
            </h2>

            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              {project.content.overview[language]}
            </p>
          </div>

          <aside className="space-y-8">
            <div>
              <h3 className="font-semibold">{t("page.challenges")}</h3>

              <p className="mt-3 leading-7 text-muted-foreground">
                {project.content.challenges[language]}
              </p>
            </div>

            <div>
              <h3 className="font-semibold">{t("page.outcome")}</h3>

              <p className="mt-3 leading-7 text-muted-foreground">
                {project.content.outcome[language]}
              </p>
            </div>
          </aside>
        </section>

        <div className="mt-16">
          <Link
            href="/projects"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {t("page.back")}
          </Link>
        </div>
      </div>
    </main>
  );
}
