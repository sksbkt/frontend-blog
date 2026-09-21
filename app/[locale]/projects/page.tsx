import { X } from "lucide-react";
import { getTranslations } from "next-intl/server";

import ProjectCard from "@/components/projects/project-card";
import Pagination from "@/components/shared/pagination";
import { Link } from "@/i18n/navigation";
import { client } from "@/lib/sanity/client";
import { mapSanityProject } from "@/lib/sanity/mappers";
import {
  projectFilterTechnologiesQuery,
  projectsQuery,
} from "@/lib/sanity/queries";

const PROJECTS_PER_PAGE = 6;

type ProjectsPageProps = {
  searchParams: Promise<{
    page?: string;
    tech?: string | string[];
  }>;
};

type ProjectFilterData = {
  allTechnologies: Array<string | null>;
  matchingTechnologies: Array<string | null>;
};

const technologyDescriptions: Record<string, string> = {
  React: "A JavaScript library for building user interfaces.",
  "Next.js": "A React framework for building full-stack web applications.",
  TypeScript:
    "A typed superset of JavaScript for safer application development.",
  JavaScript:
    "A programming language used to build interactive web applications.",
  CSS3: "A stylesheet language used to design and style web interfaces.",
  HTML: "The standard markup language used to structure web pages.",
  "Tailwind CSS":
    "A utility-first CSS framework for building custom interfaces.",
  "Node.js": "A JavaScript runtime for server-side application development.",
  Express: "A lightweight Node.js framework for building web servers and APIs.",
  "Three.js":
    "A JavaScript 3D library for creating interactive 3D experiences.",
  GSAP: "An animation library for creating high-performance web animations.",
  SVG: "A vector graphics format used for scalable web graphics.",
  Vite: "A fast frontend build tool and development server.",
  Sanity: "A headless CMS for managing structured content.",
  Netlify: "A platform for deploying and hosting modern web applications.",
  Vercel: "A platform for deploying frontend and full-stack applications.",
};

function getTechnologyDescription(technology: string) {
  return (
    technologyDescriptions[technology] ??
    `Filter projects that use ${technology}.`
  );
}

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const t = await getTranslations("projects");

  const { page: pageParam, tech: technologyParam } = await searchParams;

  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const technologies = Array.isArray(technologyParam)
    ? technologyParam.filter((technology): technology is string =>
        Boolean(technology?.trim()),
      )
    : technologyParam?.trim()
      ? [technologyParam.trim()]
      : [];

  const start = (page - 1) * PROJECTS_PER_PAGE;
  const end = start + PROJECTS_PER_PAGE + 1;

  const [sanityProjects, filterData] = await Promise.all([
    client.fetch<Parameters<typeof mapSanityProject>[0][]>(projectsQuery, {
      start,
      end,
      technologies,
    }),

    client.fetch<ProjectFilterData>(projectFilterTechnologiesQuery, {
      technologies,
    }),
  ]);

  const hasNextPage = sanityProjects.length > PROJECTS_PER_PAGE;

  const projects = sanityProjects
    .slice(0, PROJECTS_PER_PAGE)
    .map(mapSanityProject);

  const technologyCounts = filterData.matchingTechnologies.reduce<
    Record<string, number>
  >((counts, technology) => {
    if (!technology?.trim()) {
      return counts;
    }

    counts[technology] = (counts[technology] ?? 0) + 1;

    return counts;
  }, {});

  const filterTechnologies = filterData.allTechnologies
    .filter((technology): technology is string => Boolean(technology?.trim()))
    .map((technology) => ({
      name: technology,
      count: technologyCounts[technology] ?? 0,
      isActive: technologies.includes(technology),
      description: getTechnologyDescription(technology),
    }));

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

        <section className="mb-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Filter by technology
            </h2>

            {technologies.length > 0 && (
              <div className="group relative">
                <Link
                  href="/projects"
                  dir="ltr"
                  aria-label="Clear all filters"
                  className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/5 px-3.5 py-2 text-xs font-medium text-destructive transition-all duration-200 hover:border-destructive/60 hover:bg-destructive/10"
                >
                  <X className="size-3.5 shrink-0" />
                  <span>Clear all</span>
                </Link>

                <div
                  role="tooltip"
                  dir="ltr"
                  className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-max max-w-56 rounded-md border bg-popover px-3 py-2 text-left text-xs leading-5 text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
                >
                  Remove all active filters
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {filterTechnologies.map((technology) => {
              const nextTechnologies = technology.isActive
                ? technologies.filter((item) => item !== technology.name)
                : [...technologies, technology.name];

              return (
                <div
                  key={technology.name}
                  className="group relative"
                >
                  <Link
                    href={{
                      pathname: "/projects",
                      query:
                        nextTechnologies.length > 0
                          ? {
                              tech: nextTechnologies,
                            }
                          : {},
                    }}
                    dir="ltr"
                    aria-label={
                      technology.isActive
                        ? `Remove ${technology.name} filter`
                        : `Filter projects by ${technology.name}`
                    }
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      technology.isActive
                        ? "border-primary/40 bg-primary/10 text-primary shadow-sm hover:border-primary/60 hover:bg-primary/15"
                        : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <span>{technology.name}</span>

                    {technology.isActive ? (
                      <>
                        <span className="transition-opacity duration-150 group-hover:hidden">
                          {technology.count}
                        </span>

                        <X
                          aria-hidden="true"
                          className="hidden size-3.5 shrink-0 group-hover:block"
                        />
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {technology.count}
                      </span>
                    )}
                  </Link>

                  <div
                    role="tooltip"
                    dir="ltr"
                    className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-max max-w-64 -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-left text-xs leading-5 text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
                  >
                    {technology.description}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid gap-8 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              activeTechnologies={technologies}
            />
          ))}
        </div>

        <Pagination
          currentPage={page}
          hasNextPage={hasNextPage}
          basePath="/projects"
          translationNamespace="projects.page"
        />
      </div>
    </main>
  );
}
