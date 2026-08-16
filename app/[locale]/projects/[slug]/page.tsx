import Image from "next/image";
import { notFound } from "next/navigation";

import { projects } from "@/lib/data/projects";
import {
  FaGithub as Github,
  FaExternalLinkAlt as ExternalLink,
} from "react-icons/fa";
import { Link } from "@/i18n/navigation";
import { Metadata } from "next";

type ProjectPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;

  const project = projects.find((project) => project.slug === slug);

  if (!project) {
    return {
      title: "Project Not Found",
    };
  }

  return {
    title: project.title,
    description: project.description,
  };
}
export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;

  const project = projects.find((project) => project.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <main className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={project.image}
              alt={project.title}
              fill
              priority
              className="object-cover"
            />
          </div>

          <div className="p-6 md:p-10">
            <span className="text-sm font-medium uppercase tracking-widest text-primary">
              Project
            </span>

            <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
              {project.title}
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              {project.description}
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
                  GitHub
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
                  Live Demo
                </a>
              )}
            </div>
          </div>
        </div>
        <section className="mt-16 grid gap-12 md:grid-cols-3">
          <div className="md:col-span-2">
            <span className="text-sm font-medium uppercase tracking-widest text-primary">
              About the project
            </span>

            <h2 className="mt-2 text-2xl font-bold tracking-tight">Overview</h2>

            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              {project.content?.overview}
            </p>
          </div>

          <aside className="space-y-8">
            <div>
              <h3 className="font-semibold">Challenges</h3>

              <p className="mt-3 leading-7 text-muted-foreground">
                {project.content?.challenges}
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Outcome</h3>

              <p className="mt-3 leading-7 text-muted-foreground">
                {project.content?.outcome}
              </p>
            </div>
          </aside>
        </section>
        <div className="mt-16">
          <Link
            href="/projects"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to Projects
          </Link>
        </div>
      </div>
    </main>
  );
}
