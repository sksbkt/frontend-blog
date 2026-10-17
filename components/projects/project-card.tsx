"use client";

import { ArrowRight } from "lucide-react";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { useLocale, useTranslations } from "next-intl";

import Link from "next/link";
import type { Project } from "@/types/project";
import { TechBadgeGroup } from "@/components/ui/tech-badge-group";
import { LanguageBar } from "@/components/ui/language-bar";
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import { ProjectAuditBadge } from "@/components/projects/project-audit-badge";

type ProjectCardProps = {
  project: Project;
  activeTechnologies: string[];
  onTagClick?: (tech: string) => void;
};

export default function ProjectCard({
  project,
  activeTechnologies,
  onTagClick,
}: ProjectCardProps) {
  const locale = useLocale();
  const t = useTranslations("projects.card");

  const language = locale === "fa" ? "fa" : "en";

  return (
    <article className="group relative flex flex-col h-full justify-between overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-xl hover:border-primary/30">
      {/* Top Banner / Cover Image */}
      <Link
        href={`/projects/${project.slug}`}
        className="relative block h-56 w-full overflow-hidden shrink-0"
      >
        <div className="absolute inset-0 overflow-hidden">
          <ProgressiveImage
            src={project.image}
            lowResSrc={project.lowResImage || project.lowResCoverUrl}
            alt={project.title[language]}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="scale-[1.01] object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
      </Link>

      {/* Middle Content Body */}
      <div className="relative z-10 flex flex-col flex-1 p-6 pb-3">
        {/* Title and Description - Flexible Height */}
        <Link href={`/projects/${project.slug}`} className="block flex-1 group/title">
          <h3 className="text-xl font-semibold transition-colors group-hover/title:text-primary">
            {project.title[language]}
          </h3>

          <p className="mt-2.5 text-sm leading-6 text-muted-foreground line-clamp-2 min-h-[40px]">
            {project.description[language]}
          </p>
        </Link>

        {/* Technical Metadata Section - Strictly Aligned */}
        <div className="pt-4 mt-auto space-y-2.5">
          <div className="min-h-[28px] flex items-center">
            <TechBadgeGroup
              technologies={project.technologies}
              limit={3}
              activeTechnologies={activeTechnologies}
              onTagClick={onTagClick}
              className="gap-2"
              badgeClassName="rounded-full px-3 py-1 text-xs font-sans"
            />
          </div>

          <div className="min-h-[14px] flex items-center">
            {project.languages || project.rawLanguages ? (
              <LanguageBar
                languages={project.languages}
                rawLanguages={project.rawLanguages}
                barHeight="sm"
                showLegend={false}
              />
            ) : (
              <div className="h-2 w-full rounded-full bg-muted/20" />
            )}
          </div>
        </div>
      </div>

      {/* Action Footer - Strictly Aligned Baseline Across All Cards */}
      <div className="relative z-10 mt-auto flex items-center justify-between gap-3 px-6 pb-5 pt-3 border-t border-border/30">
        <div className="flex items-center gap-3">
          {project.demo && (
            <CustomTooltip content="Open live demo deployment" side="top">
              <a
                href={project.demo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
              >
                <span>{t("demo")}</span>
                <ArrowRight className="size-3.5 shrink-0 -translate-y-px rtl:rotate-180" />
              </a>
            </CustomTooltip>
          )}

          {project.github && (
            <CustomTooltip content="View source repository on GitHub" side="top">
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <span>{t("github")}</span>
              </a>
            </CustomTooltip>
          )}
        </div>

        <ProjectAuditBadge project={project} isAdmin={false} locale={locale} />
      </div>
    </article>
  );
}
