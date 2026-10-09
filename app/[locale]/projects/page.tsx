import { getLocale, getTranslations } from "next-intl/server";

import ProjectsExplorer from "@/components/projects/projects-explorer";
import { client } from "@/lib/sanity/client";
import { mapSanityProject } from "@/lib/sanity/mappers";
import { allProjectsQuery } from "@/lib/sanity/queries";

type ProjectsPageProps = {
  searchParams: Promise<{
    page?: string;
    tech?: string | string[];
  }>;
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

// Revalidate project data every 60 seconds (ISR caching)
export const revalidate = 60;

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const [t, locale] = await Promise.all([
    getTranslations("projects"),
    getLocale(),
  ]);

  const { page: pageParam, tech: technologyParam } = await searchParams;

  const initialPage = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const initialTechnologies = Array.isArray(technologyParam)
    ? technologyParam.filter((technology): technology is string =>
        Boolean(technology?.trim()),
      )
    : technologyParam?.trim()
      ? [technologyParam.trim()]
      : [];

  const sanityProjects = await client.fetch<
    Parameters<typeof mapSanityProject>[0][]
  >(allProjectsQuery, {}, { next: { revalidate: 60, tags: ["projects"] } });

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

        <ProjectsExplorer
          initialProjects={projects}
          initialTechnologies={initialTechnologies}
          initialPage={initialPage}
          locale={locale}
          technologyDescriptions={technologyDescriptions}
          translations={{
            filter: {
              title: t("filter.title"),
              addFilter: t("filter.addFilter"),
              clearAll: t("filter.clearAll"),
              active: t("filter.active"),
              searchPlaceholder: t("filter.searchPlaceholder"),
              noRemaining: t("filter.noRemaining"),
              noResults: t("filter.noResults"),
              availableCount: t("filter.availableCount"),
              matches: t("filter.matches"),
            },
            pagination: {
              previous: t("page.previous"),
              next: t("page.next"),
              page: t("page.page"),
            },
            noProjectsMatching: t("noProjectsMatching"),
            clearFilters: t("clearFilters"),
          }}
        />
      </div>
    </main>
  );
}
