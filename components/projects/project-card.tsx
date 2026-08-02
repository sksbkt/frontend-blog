import Image from "next/image";
import Link from "next/link";

import type { Project } from "@/types/project";

type ProjectCardProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-56 overflow-hidden">
        <div className="absolute -inset-2 transition-transform duration-500 ease-out group-hover:scale-105">
          <Image
            src={project.image}
            alt={project.title}
            fill
            sizes="(max-width:768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
      </div>

      <div className="-mt-8 relative z-10 p-6">
        <h3 className="text-xl font-semibold">{project.title}</h3>

        <p className="mt-3 text-muted-foreground leading-7">
          {project.description}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {project.technologies.map((tech) => (
            <span
              key={tech}
              className="rounded-full bg-muted px-3 py-1 text-xs"
            >
              {tech}
            </span>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          {project.demo && (
            <Link
              href={project.demo}
              target="_blank"
              className="text-sm font-medium text-primary hover:underline"
            >
              Live Demo →
            </Link>
          )}

          {project.github && (
            <Link
              href={project.github}
              target="_blank"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              GitHub
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
