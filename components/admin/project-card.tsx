"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Lock,
  Star,
  GitFork,
  Edit3,
  Eye,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { FaGithub as Github } from "react-icons/fa";
import { ProjectThumbnail } from "./project-thumbnail";
import { LanguageBar } from "@/components/ui/language-bar";
import { TechBadgeGroup } from "@/components/ui/tech-badge-group";
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import { ProjectAuditBadge } from "@/components/projects/project-audit-badge";
import type { RepositoryItem, RepoAuditItem, SanityProject } from "./types";

export interface ProjectCardProps {
  repo: RepositoryItem;
  locale: string;
  projectRecord?: SanityProject;
  auditItem?: RepoAuditItem;
  isAuditing?: boolean;
  onAudit?: (fullName: string) => void;
  onClick?: () => void;
}

export function ProjectCard({
  repo,
  locale,
  projectRecord,
  auditItem,
  isAuditing = false,
  onAudit,
  onClick,
}: ProjectCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    const targetEditorId = projectRecord?._id || projectRecord?.slug?.current || repo.name;
    router.push(`/${locale}/admin/projects/${encodeURIComponent(targetEditorId)}`);
  };

  const score = auditItem?.audit?.overallScore;
  const scoreClass =
    score !== undefined
      ? score >= 80
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
        : score >= 50
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
      : "";

  // Resolve technologies list
  const technologies = React.useMemo(() => {
    if (projectRecord?.technologies && projectRecord.technologies.length > 0) {
      return projectRecord.technologies;
    }
    if (repo.topics && repo.topics.length > 0) {
      return repo.topics;
    }
    return [repo.language].filter(Boolean);
  }, [projectRecord, repo]);

  // Resolve raw languages
  const rawLanguages = projectRecord?.rawLanguages || repo.languages;

  const displayTitle =
    (locale === "fa"
      ? projectRecord?.title?.fa?.trim() || projectRecord?.title?.en?.trim()
      : projectRecord?.title?.en?.trim() || projectRecord?.title?.fa?.trim()) || repo.name;

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col justify-between bg-card hover:bg-muted/30 border border-border hover:border-primary/50 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer overflow-hidden"
    >
      <div className="space-y-3.5">
        {/* Project Visual Thumbnail */}
        <div className="relative">
          <ProjectThumbnail
            repoFullName={repo.fullName}
            repoName={repo.name}
            branch={repo.defaultBranch}
            sanityCoverUrl={
              projectRecord?.coverImage?.asset?.url || projectRecord?.image?.asset?.url
            }
            sanityGifUrl={projectRecord?.previewGif?.asset?.url}
            showGif={Boolean(projectRecord?.previewGif?.asset?.url)}
            alt={displayTitle}
            aspectRatio="aspect-video"
            className="rounded-xl overflow-hidden shadow-2xs group-hover:scale-[1.01] transition-transform duration-300"
          />

          {repo.isPrivate && (
            <CustomTooltip content="Private Repository" side="top">
              <span className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg bg-background/80 backdrop-blur-md border border-border shadow-xs text-muted-foreground">
                <Lock className="w-3.5 h-3.5" />
              </span>
            </CustomTooltip>
          )}
        </div>

        {/* Title, Namespace & Audit Score */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3
              dir={locale === "fa" && projectRecord?.title?.fa ? "rtl" : "ltr"}
              className="font-bold text-base text-foreground truncate font-sans text-left group-hover:text-primary transition-colors"
              title={displayTitle}
            >
              {displayTitle}
            </h3>
            <p
              dir="ltr"
              className="text-xs font-mono text-muted-foreground truncate text-left mt-0.5"
            >
              {repo.fullName}
            </p>
          </div>

          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <ProjectAuditBadge
              project={{
                id: projectRecord?._id || repo.name,
                slug: projectRecord?.slug?.current || repo.name,
                auditScore:
                  typeof projectRecord?.auditScore === "number"
                    ? projectRecord.auditScore
                    : score ?? null,
                auditBreakdown: projectRecord?.auditBreakdown ?? null,
                auditedAt: projectRecord?.auditedAt ?? null,
              }}
              isAdmin={true}
              locale={locale}
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed text-start min-h-[32px]">
          {repo.description || "No description provided."}
        </p>

        {/* Condensed Tech Badges (First 3 + Popover) */}
        <div onClick={(e) => e.stopPropagation()}>
          <TechBadgeGroup technologies={technologies} limit={3} />
        </div>

        {/* Multi-Segment Language Bar */}
        {(projectRecord?.languages || rawLanguages) && (
          <div onClick={(e) => e.stopPropagation()} className="pt-1">
            <LanguageBar
              languages={projectRecord?.languages}
              rawLanguages={rawLanguages}
              barHeight="sm"
              showLegend={false}
            />
          </div>
        )}
      </div>

      {/* Card Footer: Metadata & Action Row */}
      <div
        className="pt-4 border-t border-border mt-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div dir="ltr" className="flex items-center gap-3 font-mono text-left">
            {repo.stars > 0 && (
              <span className="flex items-center gap-1 text-amber-500 tabular-nums">
                <Star className="w-3 h-3 fill-amber-500/20" />
                <span>{repo.stars}</span>
              </span>
            )}
            {repo.forks > 0 && (
              <span className="flex items-center gap-1 tabular-nums">
                <GitFork className="w-3 h-3" />
                <span>{repo.forks}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {projectRecord?.slug?.current && (
              <CustomTooltip content="View live portfolio project" side="top">
                <a
                  href={`/${locale}/projects/${projectRecord.slug.current}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-muted-foreground hover:text-emerald-500 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                </a>
              </CustomTooltip>
            )}

            {repo.homepage && (
              <CustomTooltip content="Open live homepage" side="top">
                <a
                  href={repo.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-muted-foreground hover:text-blue-500 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                </a>
              </CustomTooltip>
            )}

            <CustomTooltip content="Open GitHub repository" side="top">
              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
              </a>
            </CustomTooltip>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onAudit && (
            <CustomTooltip content="Run architecture audit" side="top">
              <button
                type="button"
                onClick={() => onAudit(repo.fullName)}
                disabled={isAuditing}
                className="h-9 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground transition-colors disabled:opacity-50"
              >
                {isAuditing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                )}
                <span>Audit</span>
              </button>
            </CustomTooltip>
          )}

          <CustomTooltip content="Edit project in studio" side="top">
            <button
              type="button"
              onClick={handleCardClick}
              className="h-9 px-3 flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all active:scale-[0.98]"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </CustomTooltip>
        </div>
      </div>
    </div>
  );
}
