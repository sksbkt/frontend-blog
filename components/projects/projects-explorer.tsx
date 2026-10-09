"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, FolderSearch } from "lucide-react";
import type { Project } from "@/types/project";
import ProjectCard from "@/components/projects/project-card";
import ProjectTagFilter, { type TagFilterItem } from "@/components/projects/project-tag-filter";

const PROJECTS_PER_PAGE = 6;

interface ProjectsExplorerProps {
  initialProjects: Project[];
  initialTechnologies: string[];
  initialPage?: number;
  locale: string;
  technologyDescriptions: Record<string, string>;
  translations: {
    filter: {
      title: string;
      addFilter: string;
      clearAll: string;
      active: string;
      searchPlaceholder: string;
      noRemaining: string;
      noResults: string;
      availableCount: string;
      matches: string;
    };
    pagination: {
      previous: string;
      next: string;
      page: string;
    };
    noProjectsMatching: string;
    clearFilters: string;
  };
}

export default function ProjectsExplorer({
  initialProjects,
  initialTechnologies,
  initialPage = 1,
  locale,
  technologyDescriptions,
  translations,
}: ProjectsExplorerProps) {
  const [activeTechnologies, setActiveTechnologies] = useState<string[]>(
    initialTechnologies,
  );
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  // Sync state with browser URL using shallow replaceState (Zero server requests!)
  const syncUrl = useCallback(
    (technologies: string[], page: number) => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams();
      if (page > 1) {
        params.set("page", String(page));
      }
      for (const tech of technologies) {
        params.append("tech", tech);
      }

      const queryString = params.toString();
      const nextUrl = queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;

      window.history.replaceState(null, "", nextUrl);
    },
    [],
  );

  // Handle browser back / forward navigation
  useEffect(() => {
    function handlePopState() {
      const searchParams = new URLSearchParams(window.location.search);
      const techsFromUrl = searchParams.getAll("tech");
      const pageFromUrl = Math.max(
        1,
        Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
      );

      setActiveTechnologies(techsFromUrl);
      setCurrentPage(pageFromUrl);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Filter projects by active technologies (AND logic: project must contain all active tags)
  const filteredProjects = useMemo(() => {
    if (activeTechnologies.length === 0) {
      return initialProjects;
    }

    return initialProjects.filter((project) => {
      const projectTechs = project.technologies ?? [];
      return activeTechnologies.every((activeTech) =>
        projectTechs.includes(activeTech),
      );
    });
  }, [initialProjects, activeTechnologies]);

  // Extract all unique candidate technologies across the entire project collection
  const allUniqueTechnologies = useMemo(() => {
    const set = new Set<string>();
    for (const project of initialProjects) {
      for (const tech of project.technologies ?? []) {
        if (tech?.trim()) {
          set.add(tech.trim());
        }
      }
    }
    return Array.from(set);
  }, [initialProjects]);

  // Faceted calculations for available candidate tags:
  // Count how many projects would match if candidate tag is added to the current active set
  const availableTechnologies: TagFilterItem[] = useMemo(() => {
    const candidates: TagFilterItem[] = [];

    for (const tech of allUniqueTechnologies) {
      // Exclude already active tags from candidate popup
      if (activeTechnologies.includes(tech)) {
        continue;
      }

      const testSet = [...activeTechnologies, tech];
      const count = initialProjects.filter((project) => {
        const projectTechs = project.technologies ?? [];
        return testSet.every((t) => projectTechs.includes(t));
      }).length;

      // Only show tags that yield at least 1 matching project
      if (count > 0) {
        candidates.push({
          name: tech,
          count,
          description:
            technologyDescriptions[tech] ?? `Filter projects that use ${tech}.`,
        });
      }
    }

    // Sort descending by count, then alphabetical
    return candidates.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [allUniqueTechnologies, activeTechnologies, initialProjects, technologyDescriptions]);

  // When active technologies change, update state and URL, reset page to 1
  const handleTechnologiesChange = useCallback(
    (nextTech: string[]) => {
      setActiveTechnologies(nextTech);
      setCurrentPage(1);
      syncUrl(nextTech, 1);
    },
    [syncUrl],
  );

  // Pagination calculation
  const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * PROJECTS_PER_PAGE;
    return filteredProjects.slice(start, start + PROJECTS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    syncUrl(activeTechnologies, newPage);

    // Smooth scroll to top of projects section
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  const handleClearAll = () => {
    handleTechnologiesChange([]);
  };

  // Generate pagination pages array
  const paginationPages = useMemo(() => {
    if (totalPages <= 1) return [];
    const hasPrevious = currentPage > 1;
    const hasNext = currentPage < totalPages;

    return Array.from(
      new Set(
        [
          1,
          hasPrevious ? currentPage - 1 : null,
          currentPage,
          hasNext ? currentPage + 1 : null,
          totalPages,
        ].filter((page): page is number => page !== null),
      ),
    ).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  return (
    <>
      <ProjectTagFilter
        activeTechnologies={activeTechnologies}
        availableTechnologies={availableTechnologies}
        totalMatchingProjects={filteredProjects.length}
        onTechnologiesChange={handleTechnologiesChange}
        translations={translations.filter}
      />

      {paginatedProjects.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-2">
          {paginatedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              activeTechnologies={activeTechnologies}
              onTagClick={(tech) => {
                const next = activeTechnologies.includes(tech)
                  ? activeTechnologies.filter((t) => t !== tech)
                  : [...activeTechnologies, tech];
                handleTechnologiesChange(next);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 p-12 text-center my-8">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <FolderSearch className="size-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {translations.noProjectsMatching}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {translations.filter.noResults}
          </p>
          <button
            type="button"
            onClick={handleClearAll}
            className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-xs sm:text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            {translations.clearFilters}
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-12 flex flex-wrap items-center justify-center gap-2"
        >
          {currentPage > 1 ? (
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              {locale === "fa" ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
              <span>{translations.pagination.previous}</span>
            </button>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground opacity-50"
            >
              {locale === "fa" ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
              <span>{translations.pagination.previous}</span>
            </span>
          )}

          {paginationPages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => handlePageChange(pageNumber)}
              aria-current={pageNumber === currentPage ? "page" : undefined}
              className={`inline-flex min-w-10 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                pageNumber === currentPage
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {pageNumber}
            </button>
          ))}

          {currentPage < totalPages ? (
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <span>{translations.pagination.next}</span>
              {locale === "fa" ? (
                <ChevronLeft className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground opacity-50"
            >
              <span>{translations.pagination.next}</span>
              {locale === "fa" ? (
                <ChevronLeft className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </span>
          )}
        </nav>
      )}
    </>
  );
}
