"use client";

import React from "react";
import {
  Lock,
  GitFork,
  Star,
  Camera,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import { ProjectAuditBadge } from "@/components/projects/project-audit-badge";
import type { RepositoryItem, RepoAuditItem, SanityProject } from "./types";

interface RepoListItemProps {
  repo: RepositoryItem;
  isSelected: boolean;
  onSelect: (repo: RepositoryItem) => void;
  auditItem?: RepoAuditItem;
  matchingPublished?: SanityProject;
  matchingDraft?: SanityProject;
  isCiCapturing?: boolean;
}

export function RepoListItem({
  repo,
  isSelected,
  onSelect,
  auditItem,
  matchingPublished,
  matchingDraft,
  isCiCapturing = false,
}: RepoListItemProps) {
  const t = useTranslations("admin.masterDetail");

  const score = auditItem?.audit?.overallScore;
  const hasLiveDemo = Boolean(repo.homepage || matchingPublished?.demo);
  const isSynced = repo.importStatus === "published" || Boolean(matchingPublished);
  const isDraft = repo.importStatus === "draft" || Boolean(matchingDraft);

  // Score contrast threshold: dark text in light mode, luminous text in dark mode
  const scoreClass =
    score !== undefined
      ? score >= 80
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
        : score >= 50
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
      : null;

  const projectRecord = matchingPublished || matchingDraft;
  const displayTitle = projectRecord?.title?.en?.trim() || projectRecord?.title?.fa?.trim() || repo.name;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(repo)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(repo);
        }
      }}
      className={`w-full text-start p-3 sm:p-3.5 rounded-xl border transition-all duration-150 flex flex-col gap-2 min-h-[44px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40 select-none ${
        isSelected
          ? "bg-muted border-primary shadow-md ring-1 ring-primary/40 text-foreground"
          : "bg-card hover:bg-muted/50 border-border hover:border-border/80 shadow-xs text-card-foreground"
      }`}
    >
      {/* Top row: Repo Title & Score Pill */}
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {repo.isPrivate && (
            <CustomTooltip content="Private Repository" side="top">
              <span className="shrink-0">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              </span>
            </CustomTooltip>
          )}
          <span
            dir="ltr"
            className="font-bold text-sm text-foreground truncate font-sans text-left"
            title={displayTitle}
          >
            {displayTitle}
          </span>
        </div>

        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <ProjectAuditBadge
            project={{
              id: (matchingPublished || matchingDraft)?._id || repo.name,
              slug: (matchingPublished || matchingDraft)?.slug?.current || repo.name,
              auditScore:
                typeof (matchingPublished || matchingDraft)?.auditScore === "number"
                  ? (matchingPublished || matchingDraft)?.auditScore
                  : score ?? null,
              auditBreakdown: (matchingPublished || matchingDraft)?.auditBreakdown ?? null,
              auditedAt: (matchingPublished || matchingDraft)?.auditedAt ?? null,
            }}
            isAdmin={true}
          />
        </div>
      </div>

      {/* Middle row: 1-line truncated description */}
      <p className="text-xs text-muted-foreground line-clamp-1 w-full text-start">
        {repo.description || "—"}
      </p>

      {/* Bottom row: Tech entity / micro-status indicators */}
      <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-muted-foreground w-full">
        {/* Left: Language & stats (Strictly LTR isolated) */}
        <div dir="ltr" className="flex items-center gap-2.5 font-mono text-left">
          {repo.language && (
            <span className="flex items-center gap-1 text-foreground font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="truncate max-w-[80px]">{repo.language}</span>
            </span>
          )}
          {repo.stars > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber-500 tabular-nums">
              <Star className="w-3 h-3 fill-amber-500/20" />
              {repo.stars}
            </span>
          )}
          {repo.forks > 0 && (
            <span className="inline-flex items-center gap-0.5 tabular-nums">
              <GitFork className="w-3 h-3" />
              {repo.forks}
            </span>
          )}
        </div>

        {/* Right: Micro Status Dots & Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isCiCapturing && (
            <CustomTooltip content="Automated visual capture running" side="top">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                <Camera className="w-2.5 h-2.5 animate-pulse" />
              </span>
            </CustomTooltip>
          )}

          {hasLiveDemo && (
            <CustomTooltip content="Live Demo Available" side="top">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            </CustomTooltip>
          )}

          {isSynced ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              {t("status.deployed")}
            </span>
          ) : isDraft ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              {t("status.draft")}
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-muted border border-border">
              {t("status.notImported")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
