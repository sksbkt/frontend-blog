import { getTranslations } from "next-intl/server";

import ProjectCard from "@/components/projects/project-card";
import ProjectTagFilter from "@/components/projects/project-tag-filter";
import Pagination from "@/components/shared/pagination";
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
  totalMatching: number;
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

  // Remaining candidate technologies: ONLY those with count > 0 and not already active!
  const availableTechnologies = filterData.allTechnologies
    .filter((technology): technology is string => Boolean(technology?.trim()))
    .filter((technology) => !technologies.includes(technology))
    .filter((technology) => (technologyCounts[technology] ?? 0) > 0)
    .map((technology) => ({
      name: technology,
      count: technologyCounts[technology] ?? 0,
      description: getTechnologyDescription(technology),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

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

        <ProjectTagFilter
          activeTechnologies={technologies}
          availableTechnologies={availableTechnologies}
          totalMatchingProjects={filterData.totalMatching ?? projects.length}
          translations={{
            title: t("filter.title"),
            addFilter: t("filter.addFilter"),
            clearAll: t("filter.clearAll"),
            active: t("filter.active"),
            searchPlaceholder: t("filter.searchPlaceholder"),
            noRemaining: t("filter.noRemaining"),
            noResults: t("filter.noResults"),
            availableCount: t("filter.availableCount"),
            matches: t("filter.matches"),
          }}
        />

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
