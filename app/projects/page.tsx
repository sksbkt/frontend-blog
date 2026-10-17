import { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import ProjectsExplorer from "@/components/projects/projects-explorer";
import { getDbProjects } from "@/lib/services/project-service";
import { GlobalTooltipProvider } from "@/components/ui/custom-tooltip";

export const metadata: Metadata = {
  title: "Projects | Root Zero Systems Lab",
  description: "Explore engineering projects and system architecture.",
};

export default async function DirectProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tech?: string | string[] }>;
}) {
  const [messages, t, projects, resolvedParams] = await Promise.all([
    getMessages({ locale: "en" }),
    getTranslations({ locale: "en", namespace: "projects" }),
    getDbProjects(),
    searchParams,
  ]);

  const initialPage = Math.max(1, Number.parseInt(resolvedParams.page ?? "1", 10) || 1);
  const initialTechnologies = Array.isArray(resolvedParams.tech)
    ? resolvedParams.tech.filter((t): t is string => Boolean(t?.trim()))
    : resolvedParams.tech?.trim()
    ? [resolvedParams.tech.trim()]
    : [];

  return (
    <NextIntlClientProvider messages={messages} locale="en">
      <GlobalTooltipProvider delayDuration={150} skipDelayDuration={100}>
        <main className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <ProjectsExplorer
              initialProjects={projects}
              initialTechnologies={initialTechnologies}
              initialPage={initialPage}
              locale="en"
              technologyDescriptions={{}}
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
      </GlobalTooltipProvider>
    </NextIntlClientProvider>
  );
}
