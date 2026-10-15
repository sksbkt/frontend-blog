"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Server,
  Camera,
  ShieldCheck,
  RefreshCw,
  Eye,
  Lock,
  Star,
  GitFork,
  Globe,
  Layers,
  Edit3,
} from "lucide-react";
import { FaGithub as Github } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { ProjectThumbnail } from "./project-thumbnail";
import { RepoActionsMenu } from "./repo-actions-menu";
import { TechBadgeGroup } from "@/components/ui/tech-badge-group";
import { LanguageBar } from "@/components/ui/language-bar";
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import type {
  RepositoryItem,
  RepoAuditItem,
  SanityProject,
  EnvVariableDef,
} from "./types";

interface RepoGridProps {
  repos: RepositoryItem[];
  repoAudits: Record<string, RepoAuditItem>;
  drafts: SanityProject[];
  published: SanityProject[];
  locale: string;
  analyzingRepo: string | null;
  auditingRepo: string | null;
  deployingAssetRunner: string | null;
  isDeployingVercel: boolean;
  onSelectRepo?: (repo: RepositoryItem) => void;
  onAnalyze: (fullName: string) => void;
  onAudit: (fullName: string) => void;
  onDeployVercelModal: (fullName: string, envVars?: EnvVariableDef[]) => void;
  onDeployAssetRunner: (fullName: string) => void;
  onEditProject?: (project: SanityProject) => void;
}

export function RepoGrid({
  repos,
  repoAudits,
  drafts,
  published,
  locale,
  analyzingRepo,
  auditingRepo,
  deployingAssetRunner,
  isDeployingVercel,
  onAnalyze,
  onAudit,
  onDeployVercelModal,
  onDeployAssetRunner,
}: RepoGridProps) {
  const router = useRouter();
  const t = useTranslations("admin.masterDetail");

  if (repos.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center p-8 text-center bg-card/60 rounded-2xl border border-dashed border-border">
        <Layers className="w-10 h-10 text-muted-foreground mb-2" />
        <p className="text-sm font-semibold text-foreground">
          No repositories found matching current criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
      {repos.map((repo) => {
        const auditItem = repoAudits[repo.fullName.toLowerCase()];
        const score = auditItem?.audit?.overallScore;
        const matchingPub = published.find(
          (p) => p.github && p.github.toLowerCase().includes(repo.fullName.toLowerCase())
        );
        const matchingDraft = drafts.find(
          (d) => d.github && d.github.toLowerCase().includes(repo.fullName.toLowerCase())
        );
        const projectRecord = matchingPub || matchingDraft;
        const isAnalyzing = analyzingRepo === repo.fullName;
        const isAuditing = auditingRepo === repo.fullName;
        const isCiCapturing = deployingAssetRunner === repo.fullName;

        const handleCardClick = () => {
          const targetEditorId = projectRecord?._id || projectRecord?.slug?.current || repo.name;
          router.push(`/${locale}/admin/projects/${encodeURIComponent(targetEditorId)}`);
        };

        // Score contrast threshold: dark text in light mode, bright text in dark mode
        const scoreClass =
          score !== undefined
            ? score >= 80
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
              : score >= 50
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
            : null;

        return (
          <div
            key={repo.id}
            onClick={handleCardClick}
            className="flex flex-col justify-between h-full bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-xs hover:border-primary/50 hover:shadow-md transition-all duration-200 group cursor-pointer"
          >
            {/* Top section: Thumbnail, Badges & Header */}
            <div className="space-y-3.5">
              {/* Visual Thumbnail Preview */}
              <div
                className="relative overflow-hidden rounded-xl"
              >
                <ProjectThumbnail
                  repoFullName={repo.fullName}
                  repoName={repo.name}
                  branch={repo.defaultBranch}
                  sanityCoverUrl={
                    projectRecord?.coverImage?.asset?.url || projectRecord?.image?.asset?.url
                  }
                  sanityGifUrl={projectRecord?.previewGif?.asset?.url}
                  showGif={Boolean(projectRecord?.previewGif?.asset?.url)}
                  alt={repo.name}
                  aspectRatio="aspect-video"
                  badge={
                    repo.isPrivate ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-neutral-900/80 text-white backdrop-blur-md">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Private</span>
                      </span>
                    ) : undefined
                  }
                />

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-xs">
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </div>
              </div>

              {/* Title & Score Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3
                    dir="ltr"
                    className="font-bold text-base text-foreground truncate font-sans text-left group-hover:text-primary transition-colors"
                    title={repo.name}
                  >
                    {repo.name}
                  </h3>
                  <p
                    dir="ltr"
                    className="text-xs font-mono text-muted-foreground truncate text-left mt-0.5"
                  >
                    {repo.fullName}
                  </p>
                </div>

                {score !== undefined && (
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      dir="ltr"
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border tabular-nums ${scoreClass}`}
                      title={`Audit Score: ${score}/100`}
                    >
                      {score}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed text-start min-h-[32px]">
                {repo.description || "No description provided."}
              </p>

              {/* Tech Stack Pills (First 3 + Popover) */}
              <div onClick={(e) => e.stopPropagation()}>
                <TechBadgeGroup
                  technologies={
                    projectRecord?.technologies?.length
                      ? projectRecord.technologies
                      : repo.topics?.length
                      ? repo.topics
                      : [repo.language].filter(Boolean)
                  }
                  limit={3}
                />
              </div>

              {/* GitHub Language Breakdown Bar */}
              {(projectRecord?.rawLanguages || repo.languages) && (
                <div onClick={(e) => e.stopPropagation()} className="pt-1">
                  <LanguageBar
                    rawLanguages={projectRecord?.rawLanguages || repo.languages}
                    showLegend={true}
                    maxLegendItems={3}
                  />
                </div>
              )}
            </div>

            {/* Bottom section: Metadata bar & Direct Controls */}
            <div
              className="pt-4 border-t border-border mt-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Micro stats & live links */}
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
                  {matchingPub && (
                    <CustomTooltip content="View live portfolio project" side="top">
                      <a
                        href={`/${locale}/projects/${matchingPub.slug.current}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-muted-foreground hover:text-emerald-500 transition-colors"
                        onClick={(e) => e.stopPropagation()}
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
                        onClick={(e) => e.stopPropagation()}
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
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Github className="w-3.5 h-3.5" />
                    </a>
                  </CustomTooltip>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2">
                {/* Secondary Button: Audit */}
                <CustomTooltip content="Run AI architecture audit" side="top">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAudit(repo.fullName);
                    }}
                    disabled={isAuditing}
                    className="h-9 px-2.5 inline-flex items-center justify-center gap-1 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground transition-colors disabled:opacity-50"
                  >
                    {isAuditing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    )}
                    <span className="hidden sm:inline">Audit</span>
                  </button>
                </CustomTooltip>

                {/* Secondary Button: Vercel */}
                <CustomTooltip content="Deploy to Vercel" side="top">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeployVercelModal(repo.fullName, auditItem?.audit?.envVariables);
                    }}
                    disabled={isDeployingVercel}
                    className="h-9 px-2.5 inline-flex items-center justify-center gap-1 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground transition-colors disabled:opacity-50"
                  >
                    <Server className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden sm:inline">Vercel</span>
                  </button>
                </CustomTooltip>

                {/* Secondary Button: Capture */}
                <CustomTooltip content="Capture screenshots via Playwright" side="top">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeployAssetRunner(repo.fullName);
                    }}
                    disabled={isCiCapturing}
                    className="h-9 px-2.5 inline-flex items-center justify-center gap-1 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground transition-colors disabled:opacity-50"
                  >
                    {isCiCapturing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-500" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-purple-500" />
                    )}
                    <span className="hidden sm:inline">Capture</span>
                  </button>
                </CustomTooltip>

                {/* Primary Button: Edit */}
                <CustomTooltip content="Edit project" side="top">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick();
                    }}
                    className="h-9 px-3 flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all active:scale-[0.98]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </CustomTooltip>

                {/* Actions Menu */}
                <div onClick={(e) => e.stopPropagation()}>
                  <RepoActionsMenu
                    repo={repo}
                    matchingPublished={matchingPub}
                    matchingDraft={matchingDraft}
                    locale={locale}
                    isAnalyzing={isAnalyzing}
                    isAuditing={isAuditing}
                    isDeployingVercel={isDeployingVercel}
                    isCiCapturing={isCiCapturing}
                    dropUp={true}
                    onAnalyze={() => onAnalyze(repo.fullName)}
                    onAudit={() => onAudit(repo.fullName)}
                    onDeployVercel={() =>
                      onDeployVercelModal(repo.fullName, auditItem?.audit?.envVariables)
                    }
                    onCaptureAssets={() => onDeployAssetRunner(repo.fullName)}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
