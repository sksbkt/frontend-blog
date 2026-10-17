"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Camera,
  Server,
  ExternalLink,
  BookOpen,
  GitBranch,
  Star,
  GitFork,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  GitPullRequest,
  GitCommit,
  UploadCloud,
  FileCode,
  Layers,
  Lock,
  Eye,
  Globe,
} from "lucide-react";
import { FaGithub as Github } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import { ProjectThumbnail } from "./project-thumbnail";
import { RepoActionsMenu } from "./repo-actions-menu";
import { LanguageBar } from "@/components/ui/language-bar";
import { TechBadgeGroup } from "@/components/ui/tech-badge-group";
import { ProjectAuditBadge } from "@/components/projects/project-audit-badge";
import type {
  RepositoryItem,
  RepoAuditItem,
  SanityProject,
  PushReadmeConfig,
  EnvVariableDef,
} from "./types";

interface CommandDeckDetailProps {
  repo: RepositoryItem | null;
  onBack: () => void;
  locale: string;
  auditItem?: RepoAuditItem;
  matchingPublished?: SanityProject;
  matchingDraft?: SanityProject;
  isAnalyzing: boolean;
  isAuditing: boolean;
  isDeployingVercel: boolean;
  isCiCapturing: boolean;
  isSyncingAssets: boolean;
  isImporting?: boolean;
  onAnalyze: (repoFullName: string) => void;
  onAudit: (repoFullName: string) => void;
  onDeployVercelModal: (repoFullName: string, envVars?: EnvVariableDef[]) => void;
  onDeployAssetRunner: (repoFullName: string) => void;
  onSyncAssets: (repoFullName: string, projectId?: string) => void;
  onOpenPushModal: (config: PushReadmeConfig) => void;
  onEditProject: (project: SanityProject) => void;
  onImportToLab?: (repoFullName: string) => void;
}

export function CommandDeckDetail({
  repo,
  onBack,
  locale,
  auditItem,
  matchingPublished,
  matchingDraft,
  isAnalyzing,
  isAuditing,
  isDeployingVercel,
  isCiCapturing,
  isSyncingAssets,
  isImporting = false,
  onAnalyze,
  onAudit,
  onDeployVercelModal,
  onDeployAssetRunner,
  onSyncAssets,
  onOpenPushModal,
  onEditProject,
  onImportToLab,
}: CommandDeckDetailProps) {
  const t = useTranslations("admin.masterDetail");
  const [activeTab, setActiveTab] = useState<"overview" | "audit" | "deployment" | "gallery">(
    "overview"
  );
  const [copiedReadme, setCopiedReadme] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [repoLanguages, setRepoLanguages] = useState<Record<string, number> | null>(null);

  React.useEffect(() => {
    if (!repo) return;
    const projectRecord = matchingPublished || matchingDraft;
    if (projectRecord?.rawLanguages) return;

    fetch(`/api/admin/github/languages?fullName=${encodeURIComponent(repo.fullName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.rawLanguages) {
          setRepoLanguages(data.rawLanguages);
        }
      })
      .catch(() => {});
  }, [repo?.fullName, matchingPublished, matchingDraft]);


  // If no repository is selected, show modern empty state
  if (!repo) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-card rounded-2xl border border-dashed border-border">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 border border-border shadow-inner">
          <Layers className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">
          {t("selectRepoPlaceholder")}
        </h3>
        <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
          {t("selectRepoHint")}
        </p>
      </div>
    );
  }

  const projectRecord = matchingPublished || matchingDraft;
  const auditData = auditItem?.audit;
  const readmeDraft = auditItem?.readmeDraft || auditData?.bilingualReadmeDraft;
  const score = auditData?.overallScore;

  const scoreClass =
    score !== undefined
      ? score >= 80
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
        : score >= 50
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
      : null;

  const handleCopyReadme = async () => {
    if (!readmeDraft) return;
    try {
      await navigator.clipboard.writeText(readmeDraft);
      setCopiedReadme(true);
      setTimeout(() => setCopiedReadme(false), 2000);
    } catch {}
  };

  const handleTriggerPush = (mode: "direct" | "pr") => {
    if (!readmeDraft) return;
    onOpenPushModal({
      fullName: repo.fullName,
      content: readmeDraft,
      mode,
      targetBranch: repo.defaultBranch || "main",
      branchName: "docs/update-readme-bilingual",
      commitMessage: "docs(readme): add comprehensive bilingual documentation [skip ci]",
      prTitle: "docs(readme): comprehensive bilingual documentation & visual assets",
      prBody:
        "Automated PR generated by Portfolio Admin Command Center.\n\n- Updated documentation with badges, installation, and usage\n- Added visual asset previews\n- Bilingual English & Persian overview",
    });
  };

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* 1. Header & Navigation */}
      <div className="p-4 sm:p-5 border-b border-border bg-muted/30 backdrop-blur-md shrink-0">
        {/* Mobile/Tablet Back Button */}
        <div className="lg:hidden mb-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl text-foreground bg-card border border-border hover:bg-muted transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180 shrink-0" />
            <span>{t("backToRepos")}</span>
          </button>
        </div>

        {/* Title, Badges & Quick Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h2
                dir="ltr"
                className="text-lg sm:text-xl font-bold text-foreground truncate font-sans text-left"
                title={projectRecord?.title?.en?.trim() || projectRecord?.title?.fa?.trim() || repo.name}
              >
                {projectRecord?.title?.en?.trim() || projectRecord?.title?.fa?.trim() || repo.name}
              </h2>

              <span
                dir="ltr"
                className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border shrink-0"
              >
                <GitBranch className="w-3 h-3 text-muted-foreground" />
                <span>{repo.defaultBranch || "main"}</span>
              </span>

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
                />
              </div>
            </div>

            <p
              dir="ltr"
              className="text-xs font-mono text-muted-foreground truncate text-left"
              title={repo.fullName}
            >
              {repo.fullName}
            </p>
          </div>

          {/* Primary Quick Actions Bar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Explicit Import to Lab Action for un-imported repos */}
            {repo.importStatus === "none" && onImportToLab && (
              <button
                type="button"
                onClick={() => onImportToLab(repo.fullName)}
                disabled={isImporting}
                className="h-10 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                title="Directly import repository into PostgreSQL database with sovereign cover image"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5 shrink-0" />
                    <span>Import to Lab</span>
                  </>
                )}
              </button>
            )}

            {/* Primary Action: AI Generate Draft */}
            <button
              type="button"
              onClick={() => onAnalyze(repo.fullName)}
              disabled={isAnalyzing}
              className={`h-10 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] ${
                isAnalyzing
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 cursor-wait"
                  : repo.importStatus === "none"
                  ? "bg-muted text-foreground border border-border hover:bg-muted/80"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-amber-300 shrink-0" />
                  <span>
                    {repo.importStatus !== "none" ? t("actions.reGenerate") : t("actions.quickGenerate")}
                  </span>
                </>
              )}
            </button>

            {/* Quick Action: Edit in CMS if draft or published exists */}
            {projectRecord && (
              <CustomTooltip content="Edit in CMS" side="top">
                <button
                  type="button"
                  onClick={() => onEditProject(projectRecord)}
                  className="h-10 px-3 inline-flex items-center gap-1.5 text-xs font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors"
                >
                  <FileCode className="w-4 h-4 text-blue-500" />
                  <span className="hidden sm:inline">{t("actions.editProject")}</span>
                </button>
              </CustomTooltip>
            )}

            {/* Consolidated Actions Menu */}
            <RepoActionsMenu
              repo={repo}
              matchingPublished={matchingPublished}
              matchingDraft={matchingDraft}
              locale={locale}
              isAnalyzing={isAnalyzing}
              isAuditing={isAuditing}
              isDeployingVercel={isDeployingVercel}
              isCiCapturing={isCiCapturing}
              isImporting={isImporting}
              onAnalyze={() => onAnalyze(repo.fullName)}
              onAudit={() => onAudit(repo.fullName)}
              onDeployVercel={() =>
                onDeployVercelModal(repo.fullName, auditData?.envVariables)
              }
              onCaptureAssets={() => onDeployAssetRunner(repo.fullName)}
              onImportToLab={onImportToLab ? () => onImportToLab(repo.fullName) : undefined}
            />
          </div>
        </div>

        {/* 2. Command Deck Tab Navigation */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar flex-nowrap border-b border-border pt-1">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 px-3.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap min-h-[44px] ${
              activeTab === "overview"
                ? "border-primary text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t("tabs.overview")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`pb-2.5 px-3.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap min-h-[44px] ${
              activeTab === "audit"
                ? "border-primary text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t("tabs.audit")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("deployment")}
            className={`pb-2.5 px-3.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap min-h-[44px] ${
              activeTab === "deployment"
                ? "border-primary text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Server className="w-4 h-4" />
            <span>{t("tabs.deployment")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            className={`pb-2.5 px-3.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap min-h-[44px] ${
              activeTab === "gallery"
                ? "border-primary text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{t("tabs.gallery")}</span>
          </button>
        </div>
      </div>

      {/* 3. Tab Content Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & HEALTH */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in-50 duration-150">
            {/* Visual Cover Preview Card */}
            <div className="relative rounded-2xl overflow-hidden border border-border bg-muted aspect-[16/8] sm:aspect-[21/9]">
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
                aspectRatio="aspect-[16/8] sm:aspect-[21/9]"
                className="h-full border-0 rounded-none"
              />

              {repo.homepage && (
                <div className="absolute bottom-3 end-3 z-20">
                  <a
                    href={repo.homepage}
                    target="_blank"
                    rel="noreferrer"
                    dir="ltr"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-background text-foreground hover:bg-muted shadow-md transition-colors border border-border"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{repo.homepage.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground rtl:rotate-180" />
                  </a>
                </div>
              )}
            </div>

            {/* Description & Metadata */}
            <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
              <h3 className="text-sm font-bold text-foreground">
                About Repository
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed text-start">
                {repo.description || "No description provided for this repository."}
              </p>

              {/* Technologies (First 3 + Popover) */}
              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-2 text-start">
                  Detected Tech Stack:
                </span>
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

              {/* GitHub Multi-Segment Language Breakdown */}
              {(projectRecord?.rawLanguages || repoLanguages || repo.languages) && (
                <div className="pt-2 border-t border-border/60">
                  <span className="text-xs font-semibold text-muted-foreground block mb-2 text-start">
                    Repository Languages:
                  </span>
                  <LanguageBar
                    rawLanguages={projectRecord?.rawLanguages || repoLanguages || repo.languages}
                    showLegend={true}
                    maxLegendItems={8}
                  />
                </div>
              )}
            </div>

            {/* Audit Summary Card if present */}
            {auditData?.summary && (
              <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/10 space-y-2">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Gemini Architecture Assessment</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed text-start">
                  {locale === "fa" && auditData.summary.fa
                    ? auditData.summary.fa
                    : auditData.summary.en}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: AUDIT & README */}
        {/* ========================================================================= */}
        {activeTab === "audit" && (
          <div className="space-y-6 animate-in fade-in-50 duration-150">
            {/* Top Audit Action Banner */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Google Gemini Architecture Audit
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {auditData ? "Analysis complete & cached" : "Audit not yet executed"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onAudit(repo.fullName)}
                disabled={isAuditing}
                className="h-10 px-4 inline-flex items-center gap-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-colors disabled:opacity-50"
              >
                {isAuditing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                <span>{isAuditing ? "Auditing..." : t("actions.quickAudit")}</span>
              </button>
            </div>

            {/* Strengths & Improvements */}
            {auditData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-start">
                  <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Strengths</span>
                  </h5>
                  <ul className="space-y-1.5 text-xs text-foreground">
                    {(locale === "fa" && auditData.strengths.fa.length
                      ? auditData.strengths.fa
                      : auditData.strengths.en
                    ).map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 shrink-0">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-start">
                  <h5 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-2.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Actionable Improvements</span>
                  </h5>
                  <ul className="space-y-1.5 text-xs text-foreground">
                    {(locale === "fa" && auditData.improvements.fa.length
                      ? auditData.improvements.fa
                      : auditData.improvements.en
                    ).map((imp, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 shrink-0">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Generated README Block */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-bold text-foreground">
                    Bilingual README Preview
                  </h4>
                </div>

                {readmeDraft && (
                  <button
                    type="button"
                    onClick={handleCopyReadme}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
                  >
                    {copiedReadme ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>{t("actions.copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{t("actions.copyReadme")}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {readmeDraft ? (
                <div className="relative">
                  <pre
                    dir="ltr"
                    className="p-4 rounded-xl border border-border bg-muted/60 text-xs font-mono text-foreground overflow-x-auto max-h-[45vh] leading-relaxed select-all text-left"
                  >
                    {readmeDraft}
                  </pre>
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
                  Run an AI audit above to generate a bilingual README with visual embeds.
                </div>
              )}
            </div>

            {/* Sticky Bottom Action Bar: Direct Commit vs PR */}
            {readmeDraft && (
              <div className="sticky bottom-0 z-30 p-4 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground text-start w-full sm:w-auto">
                  Sync this generated README back to repository:
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleTriggerPush("pr")}
                    className="flex-1 sm:flex-initial h-10 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition-colors"
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    <span>{t("actions.createPr")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerPush("direct")}
                    className="flex-1 sm:flex-initial h-10 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors"
                  >
                    <GitCommit className="w-3.5 h-3.5" />
                    <span>{t("actions.directCommit")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: VERCEL & DEPLOYMENT */}
        {/* ========================================================================= */}
        {activeTab === "deployment" && (
          <div className="space-y-6 animate-in fade-in-50 duration-150">
            {/* Live Domain Status Banner */}
            <div className="p-5 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">
                      Live Deployment Status
                    </h4>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  {repo.homepage ? (
                    <a
                      href={repo.homepage}
                      target="_blank"
                      rel="noreferrer"
                      dir="ltr"
                      className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5 text-left"
                    >
                      <span>{repo.homepage}</span>
                      <ExternalLink className="w-3 h-3 rtl:rotate-180" />
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5 text-start">
                      No live production domain linked yet.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onDeployVercelModal(repo.fullName, auditData?.envVariables)
                }
                disabled={isDeployingVercel}
                className="h-10 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeployingVercel ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Server className="w-3.5 h-3.5" />
                )}
                <span>
                  {isDeployingVercel ? "Deploying..." : t("actions.quickDeploy")}
                </span>
              </button>
            </div>

            {/* Detected Environment Variables Checklist */}
            <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Environment Variables Checklist</span>
                </h4>
                <span dir="ltr" className="text-xs text-muted-foreground font-mono">
                  {auditData?.envVariables?.length || 0} detected
                </span>
              </div>

              {auditData?.envVariables && auditData.envVariables.length > 0 ? (
                <div className="space-y-2">
                  {auditData.envVariables.map((env) => {
                    const isMasked = !revealedSecrets[env.key];
                    return (
                      <div
                        key={env.key}
                        className="p-3 rounded-xl border border-border bg-muted/40 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              dir="ltr"
                              className="text-xs font-mono font-bold text-foreground text-left"
                            >
                              {env.key}
                            </span>
                            {env.required && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5 text-start">
                            {env.description}
                          </p>
                        </div>

                        <div dir="ltr" className="flex items-center gap-2 shrink-0 font-mono">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {isMasked ? "••••••••" : "Configured"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedSecrets((prev) => ({
                                ...prev,
                                [env.key]: !prev[env.key],
                              }))
                            }
                            className="p-1 text-muted-foreground hover:text-foreground"
                            title={isMasked ? "Reveal Secret" : "Hide Secret"}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No strict backend secrets required for this project (Static / Jamstack application).
                </div>
              )}
            </div>

            {/* Sticky Bottom Deploy Bar */}
            <div className="sticky bottom-0 z-30 p-4 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-lg flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                Ready to deploy with configured parameters?
              </span>
              <button
                type="button"
                onClick={() =>
                  onDeployVercelModal(repo.fullName, auditData?.envVariables)
                }
                disabled={isDeployingVercel}
                className="h-10 px-5 inline-flex items-center gap-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors disabled:opacity-50"
              >
                <Server className="w-3.5 h-3.5" />
                <span>{t("actions.quickDeploy")}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MEDIA & GALLERY */}
        {/* ========================================================================= */}
        {activeTab === "gallery" && (
          <div className="space-y-6 animate-in fade-in-50 duration-150">
            {/* Playwright CI Trigger Banner */}
            <div className="p-5 rounded-2xl border border-purple-500/20 bg-purple-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Playwright Visual Asset Generator
                  </h4>
                  <p className="text-xs text-muted-foreground text-start">
                    Captures desktop &amp; mobile fullpage screenshots and animated GIF in GitHub Actions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onDeployAssetRunner(repo.fullName)}
                  disabled={isCiCapturing}
                  className="h-10 px-3.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  {isCiCapturing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  <span>{isCiCapturing ? "Capturing..." : t("actions.quickCapture")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSyncAssets(repo.fullName, projectRecord?._id)}
                  disabled={isSyncingAssets}
                  className="h-10 px-3.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {isSyncingAssets ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                  )}
                  <span>{isSyncingAssets ? "Syncing..." : t("actions.syncAssets")}</span>
                </button>
              </div>
            </div>

            {/* Media Grid using ProjectThumbnail */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground text-start">
                Project Media Assets
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* GitHub Open Graph Social Preview */}
                <div className="rounded-xl overflow-hidden border border-border bg-card">
                  <ProjectThumbnail
                    repoFullName={repo.fullName}
                    repoName={repo.name}
                    branch={repo.defaultBranch}
                    sanityCoverUrl={`https://opengraph.githubassets.com/1/${repo.fullName}`}
                    alt="GitHub Open Graph Social Card"
                    aspectRatio="aspect-video"
                  />
                  <div className="p-3 text-xs text-start">
                    <span className="font-bold text-foreground block">
                      GitHub Open Graph Social Card
                    </span>
                    <span dir="ltr" className="text-[11px] font-mono text-muted-foreground block text-left">
                      opengraph.githubassets.com
                    </span>
                  </div>
                </div>

                {/* Hero Desktop Preview */}
                <div className="rounded-xl overflow-hidden border border-border bg-card">
                  <ProjectThumbnail
                    repoFullName={repo.fullName}
                    repoName={repo.name}
                    branch={repo.defaultBranch}
                    sanityCoverUrl={
                      projectRecord?.coverImage?.asset?.url || projectRecord?.image?.asset?.url
                    }
                    alt="Hero Desktop View"
                    aspectRatio="aspect-video"
                  />
                  <div className="p-3 text-xs text-start">
                    <span className="font-bold text-foreground block">
                      Desktop Hero Screenshot
                    </span>
                    <span dir="ltr" className="text-[11px] font-mono text-muted-foreground block text-left">
                      assets/hero.png
                    </span>
                  </div>
                </div>

                {/* Animated GIF Preview */}
                <div className="rounded-xl overflow-hidden border border-border bg-card">
                  <ProjectThumbnail
                    repoFullName={repo.fullName}
                    repoName={repo.name}
                    branch={repo.defaultBranch}
                    sanityGifUrl={projectRecord?.previewGif?.asset?.url}
                    showGif={true}
                    alt="Animated Preview GIF"
                    aspectRatio="aspect-video"
                  />
                  <div className="p-3 text-xs text-start">
                    <span className="font-bold text-foreground block">
                      Animated Preview GIF
                    </span>
                    <span dir="ltr" className="text-[11px] font-mono text-muted-foreground block text-left">
                      assets/preview.gif
                    </span>
                  </div>
                </div>

                {/* Sanity Extra Gallery Items */}
                {projectRecord?.gallery?.map((item, idx) => (
                  <div
                    key={item._key || idx}
                    className="rounded-xl overflow-hidden border border-border bg-card"
                  >
                    <ProjectThumbnail
                      sanityCoverUrl={item.asset?.url}
                      alt={item.caption || "Media Asset"}
                      aspectRatio="aspect-video"
                    />
                    <div className="p-3 text-xs text-start">
                      <span className="font-bold text-foreground block truncate">
                        {item.caption || `Media Image ${idx + 1}`}
                      </span>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        Sanity Asset Storage
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
