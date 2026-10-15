"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Search,
  RefreshCw,
  LogOut,
  ExternalLink,
  Layers,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  LayoutGrid,
  Columns2,
} from "lucide-react";
import { FaGithub as Github } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { RepoListItem } from "./repo-list-item";
import { RepoGrid } from "./repo-grid";
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import { CommandDeckDetail } from "./command-deck-detail";
import { PushReadmeModal } from "./push-readme-modal";
import { VercelDeployModal } from "./vercel-deploy-modal";
import { ProjectEditModal } from "./project-edit-modal";
import type {
  AdminSession,
  RepositoryItem,
  SanityProject,
  RepoAuditItem,
  PushReadmeConfig,
  VercelModalConfig,
  EnvVariableDef,
} from "./types";

interface AdminDashboardProps {
  initialSession: AdminSession | null;
  locale: string;
}

export default function AdminDashboard({
  initialSession,
  locale,
}: AdminDashboardProps) {
  const t = useTranslations("admin");
  const tMD = useTranslations("admin.masterDetail");

  const [session] = useState<AdminSession | null>(initialSession);

  // Dual-View Mode: "split" (Master-Detail) vs "grid" (Legacy Card Grid)
  const [viewMode, setViewMode] = useState<"split" | "grid">("split");

  // Repositories state
  const [repos, setRepos] = useState<RepositoryItem[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "synced" | "missingReadme" | "hasLiveDemo">("all");

  // Projects state (Drafts & Published from Sanity)
  const [drafts, setDrafts] = useState<SanityProject[]>([]);
  const [published, setPublished] = useState<SanityProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Audits state (persisted in localStorage)
  const [repoAudits, setRepoAudits] = useState<Record<string, RepoAuditItem>>({});
  const [auditingRepo, setAuditingRepo] = useState<string | null>(null);
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);
  const [deployingAssetRunner, setDeployingAssetRunner] = useState<string | null>(null);
  const [isSyncingAssets, setIsSyncingAssets] = useState(false);

  // Modals state
  const [pushingReadmeConfig, setPushingReadmeConfig] = useState<PushReadmeConfig | null>(null);
  const [envModalConfig, setEnvModalConfig] = useState<VercelModalConfig | null>(null);
  const [editingProject, setEditingProject] = useState<SanityProject | null>(null);

  // Toast message state
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  // Load persisted view mode & audits from localStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlView = urlParams.get("view");
        if (urlView === "grid" || urlView === "split") {
          setViewMode(urlView);
        } else {
          const savedMode =
            localStorage.getItem("admin_view_mode") ||
            localStorage.getItem("portfolio_admin_view_mode");
          if (savedMode === "split" || savedMode === "grid") {
            setViewMode(savedMode);
          }
        }
      }
      const savedAudits = localStorage.getItem("portfolio_admin_repo_audits");
      if (savedAudits) {
        setRepoAudits(JSON.parse(savedAudits));
      }
    } catch {}
  }, []);

  const handleToggleViewMode = (mode: "split" | "grid") => {
    setViewMode(mode);
    try {
      localStorage.setItem("admin_view_mode", mode);
    } catch {}
  };

  const updateAuditData = useCallback((repoKey: string, data: RepoAuditItem) => {
    setRepoAudits((prev) => {
      const next = { ...prev, [repoKey.toLowerCase()]: data };
      try {
        localStorage.setItem("portfolio_admin_repo_audits", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Fetch Repositories from GitHub API route
  const fetchRepos = useCallback(async () => {
    if (!session) return;
    setReposLoading(true);
    try {
      const res = await fetch(
        `/api/admin/github/repos?search=${encodeURIComponent(repoSearch)}`
      );
      if (!res.ok) throw new Error("Failed to fetch repositories.");
      const data = await res.json();
      setRepos(data.repos || []);

      // If user hasn't selected a repo yet, default to first repo on desktop
      if (data.repos?.length > 0 && selectedRepoId === null) {
        setSelectedRepoId(data.repos[0].id);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error fetching repositories", "error");
    } finally {
      setReposLoading(false);
    }
  }, [session, repoSearch, selectedRepoId, showToast]);

  // Fetch Projects from Sanity API route
  const fetchProjects = useCallback(async () => {
    if (!session) return;
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/admin/projects");
      if (!res.ok) throw new Error("Failed to fetch CMS projects.");
      const data = await res.json();
      setDrafts(data.drafts || []);
      setPublished(data.published || []);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setProjectsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchRepos();
      fetchProjects();
    }
  }, [session, fetchRepos, fetchProjects]);

  // Run AI Audit on repository
  const handleRunAudit = async (fullName: string) => {
    setAuditingRepo(fullName);
    try {
      const res = await fetch("/api/admin/github/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to audit repository.");

      updateAuditData(fullName, {
        audit: data.audit,
        readmeDraft: data.readmeDraft,
        context: data.context,
      });

      showToast(`AI audit completed for ${fullName}! Score: ${data.audit.overallScore}/100`, "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error running AI audit", "error");
    } finally {
      setAuditingRepo(null);
    }
  };

  // Generate complete project draft via Gemini
  const handleAnalyzeRepo = async (fullName: string) => {
    setAnalyzingRepo(fullName);
    try {
      const res = await fetch("/api/admin/projects/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate project draft.");

      // Refresh repos & projects
      await fetchProjects();
      setRepos((prev) =>
        prev.map((r) =>
          r.fullName.toLowerCase() === fullName.toLowerCase()
            ? { ...r, importStatus: "draft" }
            : r
        )
      );

      showToast(`Draft created in Sanity CMS for ${fullName}!`, "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error generating draft", "error");
    } finally {
      setAnalyzingRepo(null);
    }
  };

  // Deploy Playwright Asset Workflow to repository
  const handleDeployAssetRunner = async (fullName: string) => {
    setDeployingAssetRunner(fullName);
    try {
      const res = await fetch("/api/admin/github/deploy-asset-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger visual capture.");

      showToast(
        data.workflowDispatched
          ? "Playwright capture workflow deployed & triggered on GitHub Actions!"
          : "Capture scripts committed to repository.",
        "success"
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error capturing assets", "error");
    } finally {
      setDeployingAssetRunner(null);
    }
  };

  // Sync Assets from GitHub to Sanity
  const handleSyncAssets = async (fullName: string, projectId?: string) => {
    setIsSyncingAssets(true);
    try {
      const parts = fullName.split("/");
      if (parts.length < 2) throw new Error("Invalid repository name.");

      const res = await fetch("/api/admin/projects/sync-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: parts[0],
          repo: parts[1],
          projectId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync assets.");

      await fetchProjects();
      showToast(
        `Synced ${data.syncedAssets?.length || 0} visual assets to Sanity CMS!`,
        "success"
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error syncing assets", "error");
    } finally {
      setIsSyncingAssets(false);
    }
  };

  // Save Project Edits to Sanity
  const handleSaveProjectEdits = async (updatedProject: SanityProject) => {
    const res = await fetch("/api/admin/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProject),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save project.");

    await fetchProjects();
  };

  // Filter Repositories based on search & active filter chip
  const filteredRepos = useMemo(() => {
    let result = repos;

    if (repoSearch.trim()) {
      const query = repoSearch.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.fullName.toLowerCase().includes(query) ||
          (r.description && r.description.toLowerCase().includes(query)) ||
          r.topics?.some((t) => t.toLowerCase().includes(query)) ||
          (r.language && r.language.toLowerCase().includes(query))
      );
    }

    if (filterMode === "synced") {
      result = result.filter((r) => r.importStatus === "published" || r.importStatus === "draft");
    } else if (filterMode === "missingReadme") {
      result = result.filter((r) => {
        const audit = repoAudits[r.fullName.toLowerCase()];
        return audit?.context?.hasReadme === false;
      });
    } else if (filterMode === "hasLiveDemo") {
      result = result.filter((r) => Boolean(r.homepage));
    }

    return result;
  }, [repos, repoSearch, filterMode, repoAudits]);

  // Selected Repository instance
  const selectedRepo = useMemo(() => {
    if (selectedRepoId === null) return null;
    return repos.find((r) => r.id === selectedRepoId) || null;
  }, [repos, selectedRepoId]);

  // Matching Draft or Published project for selected repo
  const matchingDraft = useMemo(() => {
    if (!selectedRepo) return undefined;
    return drafts.find(
      (d) =>
        d.github &&
        d.github.toLowerCase().includes(selectedRepo.fullName.toLowerCase())
    );
  }, [drafts, selectedRepo]);

  const matchingPublished = useMemo(() => {
    if (!selectedRepo) return undefined;
    return published.find(
      (p) =>
        p.github &&
        p.github.toLowerCase().includes(selectedRepo.fullName.toLowerCase())
    );
  }, [published, selectedRepo]);

  // ---------------------------------------------------------------------------
  // RENDER: GITHUB OAUTH LOGIN SCREEN (If not logged in)
  // ---------------------------------------------------------------------------
  if (!session) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 relative">
        <div className="w-full max-w-md flex justify-end mb-3">
          <ModeToggle />
        </div>
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 backdrop-blur-xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border shadow-inner">
            <Lock className="w-8 h-8 text-foreground" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
            {t("login.title")}
          </h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            {t("login.description")}
          </p>

          <a
            href={`/api/auth/github?returnTo=/${locale}/admin`}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-lg active:scale-[0.98]"
          >
            <Github className="w-5 h-5" />
            <span>{t("login.connect")}</span>
          </a>

          <div className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground flex items-center justify-center gap-2">
            <span>{t("login.envNote")}</span>
            <code dir="ltr" className="text-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
              .env.local
            </code>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: LOGGED-IN DUAL-VIEW COMMAND CENTER
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col h-[calc(100vh-4rem)]">
      {/* Toast Notification */}
      {message && (
        <div
          className={`fixed bottom-6 end-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            message.type === "success"
              ? "bg-emerald-950/90 border-emerald-700/80 text-emerald-200"
              : "bg-red-950/90 border-red-700/80 text-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="ms-2 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        {/* User Identity */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <Image
              src={session.user.avatar_url}
              alt={session.user.login}
              width={46}
              height={46}
              className="rounded-full border-2 border-border shadow-xs"
            />
            <span className="absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-card" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-foreground">
                {session.user.name || session.user.login}
              </h1>
              <span dir="ltr" className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                @{session.user.login}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("header.subtitle")}
            </p>
          </div>
        </div>

        {/* Toolbar: Dual-View Switcher + ModeToggle + Profile + Logout */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Dual-View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-muted border border-border">
            <button
              type="button"
              onClick={() => handleToggleViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={tMD("viewMode.grid")}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">{tMD("viewMode.grid")}</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleViewMode("split")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                viewMode === "split"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={tMD("viewMode.split")}
            >
              <Columns2 className="w-4 h-4" />
              <span className="hidden md:inline">{tMD("viewMode.split")}</span>
            </button>
          </div>

          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* Theme Mode Toggle */}
          <ModeToggle />

          {/* GitHub Profile */}
          <a
            href={session.user.html_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted/60 transition-colors shadow-xs min-h-[40px]"
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("header.githubProfile")}</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground rtl:rotate-180" />
          </a>

          {/* Logout */}
          <a
            href="/api/auth/logout"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 transition-colors min-h-[40px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("header.logout")}</span>
          </a>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIEWPORT MODE 1: MASTER-DETAIL SPLIT VIEW */}
      {/* ===================================================================== */}
      {viewMode === "split" && (
        <div className="flex-1 min-h-0 flex gap-4 overflow-hidden h-[calc(100vh-10.5rem)]">
          {/* Master Column (Repo List) */}
          <div
            className={`${
              selectedRepoId !== null ? "hidden lg:flex" : "flex"
            } w-full lg:w-96 flex-col shrink-0 rounded-2xl border border-border bg-card shadow-xs overflow-hidden h-full`}
          >
            {/* Sticky Search & Filter Header */}
            <div className="p-3.5 border-b border-border bg-muted/40 space-y-3 shrink-0">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("repos.searchPlaceholder")}
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchRepos()}
                  className="w-full ps-9 pe-8 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
                {repoSearch && (
                  <button
                    type="button"
                    onClick={() => setRepoSearch("")}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Horizontal Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors min-h-[32px] ${
                    filterMode === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                  }`}
                >
                  {tMD("filters.all")}
                </button>

                <button
                  type="button"
                  onClick={() => setFilterMode("synced")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors min-h-[32px] ${
                    filterMode === "synced"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                  }`}
                >
                  {tMD("filters.synced")}
                </button>

                <button
                  type="button"
                  onClick={() => setFilterMode("missingReadme")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors min-h-[32px] ${
                    filterMode === "missingReadme"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                  }`}
                >
                  {tMD("filters.missingReadme")}
                </button>

                <button
                  type="button"
                  onClick={() => setFilterMode("hasLiveDemo")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors min-h-[32px] ${
                    filterMode === "hasLiveDemo"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                  }`}
                >
                  {tMD("filters.hasLiveDemo")}
                </button>
              </div>

              {/* Stats & Refresh */}
              <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
                <span dir="ltr" className="font-mono tabular-nums text-left">
                  {filteredRepos.length} repositories
                </span>
                <button
                  type="button"
                  onClick={fetchRepos}
                  disabled={reposLoading}
                  className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                >
                  <RefreshCw className={`w-3 h-3 ${reposLoading ? "animate-spin" : ""}`} />
                  <span>{t("repos.refresh")}</span>
                </button>
              </div>
            </div>

            {/* List Viewport */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
              {reposLoading && repos.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-neutral-500" />
                  <span>{t("repos.loading")}</span>
                </div>
              ) : filteredRepos.length > 0 ? (
                filteredRepos.map((repo) => {
                  const audit = repoAudits[repo.fullName.toLowerCase()];
                  const isSelected = selectedRepoId === repo.id;
                  const matchPub = published.find(
                    (p) => p.github && p.github.toLowerCase().includes(repo.fullName.toLowerCase())
                  );
                  const matchDraft = drafts.find(
                    (d) => d.github && d.github.toLowerCase().includes(repo.fullName.toLowerCase())
                  );

                  return (
                    <RepoListItem
                      key={repo.id}
                      repo={repo}
                      isSelected={isSelected}
                      onSelect={(selected) => setSelectedRepoId(selected.id)}
                      auditItem={audit}
                      matchingPublished={matchPub}
                      matchingDraft={matchDraft}
                      isCiCapturing={deployingAssetRunner === repo.fullName}
                    />
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-neutral-400">
                  <p className="font-semibold mb-1">{t("repos.empty")}</p>
                  <p>{t("repos.emptyHint")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Detail Column (Command Deck) */}
          <div
            className={`${
              selectedRepoId === null ? "hidden lg:flex" : "flex"
            } flex-1 h-full min-w-0`}
          >
            <CommandDeckDetail
              repo={selectedRepo}
              onBack={() => setSelectedRepoId(null)}
              locale={locale}
              auditItem={
                selectedRepo ? repoAudits[selectedRepo.fullName.toLowerCase()] : undefined
              }
              matchingPublished={matchingPublished}
              matchingDraft={matchingDraft}
              isAnalyzing={analyzingRepo === selectedRepo?.fullName}
              isAuditing={auditingRepo === selectedRepo?.fullName}
              isDeployingVercel={false}
              isCiCapturing={deployingAssetRunner === selectedRepo?.fullName}
              isSyncingAssets={isSyncingAssets}
              onAnalyze={handleAnalyzeRepo}
              onAudit={handleRunAudit}
              onDeployVercelModal={(fullName, envVars) =>
                setEnvModalConfig({
                  repoFullName: fullName,
                  branch: selectedRepo?.defaultBranch || "main",
                  envVariables: envVars || [],
                })
              }
              onDeployAssetRunner={handleDeployAssetRunner}
              onSyncAssets={handleSyncAssets}
              onOpenPushModal={(cfg) => setPushingReadmeConfig(cfg)}
              onEditProject={(proj) => setEditingProject(proj)}
            />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEWPORT MODE 2: LEGACY CARD GRID VIEW */}
      {/* ===================================================================== */}
      {viewMode === "grid" && (
        <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden h-[calc(100vh-10.5rem)]">
          {/* Top Filter and Search Bar for Grid */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("repos.searchPlaceholder")}
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchRepos()}
                className="w-full ps-9 pe-8 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
              {repoSearch && (
                <button
                  type="button"
                  onClick={() => setRepoSearch("")}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors min-h-[34px] ${
                  filterMode === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                }`}
              >
                {tMD("filters.all")}
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("synced")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors min-h-[34px] ${
                  filterMode === "synced"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                }`}
              >
                {tMD("filters.synced")}
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("missingReadme")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors min-h-[34px] ${
                  filterMode === "missingReadme"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                }`}
              >
                {tMD("filters.missingReadme")}
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("hasLiveDemo")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors min-h-[34px] ${
                  filterMode === "hasLiveDemo"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                }`}
              >
                {tMD("filters.hasLiveDemo")}
              </button>

              <CustomTooltip content="Refresh Repositories" side="bottom">
                <button
                  type="button"
                  onClick={fetchRepos}
                  disabled={reposLoading}
                  className="ms-2 p-2 rounded-lg border border-border text-foreground hover:bg-muted min-h-[34px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reposLoading ? "animate-spin" : ""}`} />
                </button>
              </CustomTooltip>
            </div>
          </div>

          {/* Grid Scrollable Viewport */}
          <div className="flex-1 overflow-y-auto pe-1 pb-8">
            {reposLoading && repos.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-neutral-500" />
                <span>{t("repos.loading")}</span>
              </div>
            ) : (
              <RepoGrid
                repos={filteredRepos}
                repoAudits={repoAudits}
                drafts={drafts}
                published={published}
                locale={locale}
                analyzingRepo={analyzingRepo}
                auditingRepo={auditingRepo}
                deployingAssetRunner={deployingAssetRunner}
                isDeployingVercel={false}
                onAnalyze={handleAnalyzeRepo}
                onAudit={handleRunAudit}
                onDeployVercelModal={(fullName, envVars) =>
                  setEnvModalConfig({
                    repoFullName: fullName,
                    branch: "main",
                    envVariables: envVars || [],
                  })
                }
                onDeployAssetRunner={handleDeployAssetRunner}
                onEditProject={(proj) => setEditingProject(proj)}
              />
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALS */}
      {/* ===================================================================== */}
      {pushingReadmeConfig && (
        <PushReadmeModal
          config={pushingReadmeConfig}
          isOpen={Boolean(pushingReadmeConfig)}
          onClose={() => setPushingReadmeConfig(null)}
          onSuccess={() => {}}
          showToast={showToast}
        />
      )}

      {envModalConfig && (
        <VercelDeployModal
          config={envModalConfig}
          isOpen={Boolean(envModalConfig)}
          onClose={() => setEnvModalConfig(null)}
          onSuccess={(res) => {
            if (selectedRepo) {
              setRepos((prev) =>
                prev.map((r) =>
                  r.id === selectedRepo.id ? { ...r, homepage: res.liveUrl } : r
                )
              );
            }
          }}
          showToast={showToast}
        />
      )}

      {editingProject && (
        <ProjectEditModal
          project={editingProject}
          isOpen={Boolean(editingProject)}
          onClose={() => setEditingProject(null)}
          onSave={handleSaveProjectEdits}
          showToast={showToast}
        />
      )}
    </div>
  );
}
