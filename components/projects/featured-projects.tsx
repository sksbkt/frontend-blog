import ProjectCard from "@/components/projects/project-card";
import { projects } from "@/lib/data/projects";

export default function FeaturedProjects() {
  const featuredProjects = projects.filter((project) => project.featured);

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="text-sm font-medium uppercase tracking-widest text-primary">
              Projects
            </span>

            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Featured Projects
            </h2>

            <p className="mt-3 max-w-2xl text-muted-foreground">
              A selection of projects I've built with modern frontend
              technologies, focusing on performance, accessibility, and user
              experience.
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
