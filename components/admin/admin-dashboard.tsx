"use client";

import React, { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import {
  Sparkles,
  CheckCircle2,
  Trash2,
  Edit3,
  ExternalLink,
  RefreshCw,
  Search,
  LogOut,
  FolderGit2,
  Layers,
  ArrowRight,
  X,
  AlertCircle,
  Eye,
  Lock,
  Globe,
  Star,
  GitFork,
  Code,
  FileText,
} from "lucide-react";
import { FaGithub as Github } from "react-icons/fa";

type AdminUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
};

type AdminSession = {
  user: AdminUser;
  accessToken: string;
  createdAt: number;
};

type RepositoryItem = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  homepage: string;
  language: string;
  stars: number;
  forks: number;
  isPrivate: boolean;
  updatedAt: string;
  topics: string[];
  defaultBranch: string;
  importStatus: "published" | "draft" | "none";
};

type LocalizedText = {
  en: string;
  fa: string;
};

type ProjectContent = {
  overview: LocalizedText;
  challenges: LocalizedText;
  outcome: LocalizedText;
};

type SanityProject = {
  _id: string;
  _createdAt: string;
  _updatedAt: string;
  title: LocalizedText;
  slug: { current: string };
  description: LocalizedText;
  technologies: string[];
  github: string;
  demo?: string;
  featured?: boolean;
  content: ProjectContent;
  isDraft: boolean;
};

interface AdminDashboardProps {
  initialSession: AdminSession | null;
  locale: string;
}

export default function AdminDashboard({ initialSession, locale }: AdminDashboardProps) {
  const [session, setSession] = useState<AdminSession | null>(initialSession);
  const [activeTab, setActiveTab] = useState<"repos" | "drafts" | "published">("repos");

  // Repositories state
  const [repos, setRepos] = useState<RepositoryItem[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);

  // Projects & Drafts state
  const [drafts, setDrafts] = useState<SanityProject[]>([]);
  const [published, setPublished] = useState<SanityProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Editing state
  const [editingProject, setEditingProject] = useState<SanityProject | null>(null);
  const [editForm, setEditForm] = useState<SanityProject | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Toast / notification
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // Fetch repositories
  const fetchRepos = async () => {
    if (!session) return;
    setReposLoading(true);
    try {
      const res = await fetch(`/api/admin/github/repos?search=${encodeURIComponent(repoSearch)}`);
      const data = await res.json();
      if (data.success) {
        setRepos(data.repos);
      } else {
        showToast(data.message || "Failed to load repositories", "error");
      }
    } catch (err) {
      showToast("Error loading repositories", "error");
    } finally {
      setReposLoading(false);
    }
  };

  // Fetch projects (drafts & published)
  const fetchProjects = async () => {
    if (!session) return;
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/admin/projects");
      const data = await res.json();
      if (data.success) {
        setDrafts(data.drafts || []);
        setPublished(data.published || []);
      } else {
        showToast(data.message || "Failed to load CMS projects", "error");
      }
    } catch {
      showToast("Error connecting to Sanity CMS", "error");
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchRepos();
      fetchProjects();
    }
  }, [session]);

  // Trigger AI analysis on repository
  const handleAnalyzeRepo = async (fullName: string) => {
    setAnalyzingRepo(fullName);
    showToast(`Analyzing ${fullName} with AI... This takes ~30-40 seconds.`, "success");

    try {
      const res = await fetch("/api/admin/projects/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(`Draft created successfully for ${fullName}! Review it below.`, "success");
        await fetchProjects();
        await fetchRepos();
        setActiveTab("drafts");
      } else {
        showToast(data.message || data.error || "Analysis failed.", "error");
      }
    } catch (err) {
      showToast("Failed to analyze repository. Check server logs.", "error");
    } finally {
      setAnalyzingRepo(null);
    }
  };

  // Publish draft
  const handlePublish = async (id: string) => {
    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", id }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Project published to portfolio!", "success");
        await fetchProjects();
        await fetchRepos();
      } else {
        showToast(data.message || "Publishing failed", "error");
      }
    } catch {
      showToast("Error publishing project", "error");
    }
  };

  // Unpublish
  const handleUnpublish = async (id: string) => {
    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unpublish", id }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Project moved to drafts.", "success");
        await fetchProjects();
        await fetchRepos();
      } else {
        showToast(data.message || "Unpublishing failed", "error");
      }
    } catch {
      showToast("Error unpublishing project", "error");
    }
  };

  // Delete project or draft
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/projects?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        showToast("Project deleted.", "success");
        await fetchProjects();
        await fetchRepos();
      } else {
        showToast(data.message || "Failed to delete project", "error");
      }
    } catch {
      showToast("Error deleting project", "error");
    }
  };

  // Open edit modal
  const handleStartEdit = (proj: SanityProject) => {
    setEditingProject(proj);
    setEditForm(JSON.parse(JSON.stringify(proj)));
  };

  // Save edit form
  const handleSaveEdit = async () => {
    if (!editForm || !editingProject) return;
    setSavingEdit(true);

    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProject._id,
          data: {
            title: editForm.title,
            slug: editForm.slug.current,
            description: editForm.description,
            technologies: editForm.technologies,
            github: editForm.github,
            demo: editForm.demo,
            featured: editForm.featured,
            content: editForm.content,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Project changes saved successfully!", "success");
        setEditingProject(null);
        setEditForm(null);
        await fetchProjects();
      } else {
        showToast(data.message || "Save failed", "error");
      }
    } catch {
      showToast("Error saving project changes", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // If not logged in, show GitHub OAuth Login Screen
  if (!session) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-neutral-700 shadow-inner">
            <Lock className="w-8 h-8 text-neutral-300" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Portfolio Admin Studio
          </h1>
          <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
            Connect your GitHub account to import repositories, run AI project analysis, and review
            CMS drafts.
          </p>

          <a
            href={`/api/auth/github?returnTo=/${locale}/admin`}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-white text-neutral-950 font-semibold rounded-xl hover:bg-neutral-200 transition-all duration-200 shadow-lg hover:shadow-neutral-500/10 active:scale-[0.98]"
          >
            <Github className="w-5 h-5" />
            <span>Connect with GitHub</span>
          </a>

          <div className="mt-8 pt-6 border-t border-neutral-800/80 text-xs text-neutral-500 flex items-center justify-center gap-2">
            <span>Requires GitHub OAuth App credentials in</span>
            <code className="text-neutral-300 bg-neutral-800 px-1.5 py-0.5 rounded font-mono">
              .env.local
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {message && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in fade-in slide-in-from-bottom-5 duration-300 ${
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
            onClick={() => setMessage(null)}
            className="ml-2 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 backdrop-blur-md mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Image
              src={session.user.avatar_url}
              alt={session.user.login}
              width={56}
              height={56}
              className="rounded-full border-2 border-neutral-700 shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-neutral-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {session.user.name || session.user.login}
              </h1>
              <span className="text-xs font-mono bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full border border-neutral-700">
                @{session.user.login}
              </span>
            </div>
            <p className="text-sm text-neutral-400">Portfolio CMS & AI Project Generator</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={session.user.html_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium rounded-xl border border-neutral-700 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>GitHub Profile</span>
            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
          </a>

          <a
            href="/api/auth/logout"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-sm font-medium rounded-xl border border-red-900/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-4 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab("repos")}
          className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === "repos"
              ? "bg-white text-neutral-950 shadow-md font-semibold"
              : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          <span>Repositories</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "repos" ? "bg-neutral-200 text-neutral-900" : "bg-neutral-800 text-neutral-400"
            }`}
          >
            {repos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("drafts")}
          className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === "drafts"
              ? "bg-white text-neutral-950 shadow-md font-semibold"
              : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Drafts for Review</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              drafts.length > 0
                ? "bg-amber-500 text-neutral-950 animate-pulse"
                : activeTab === "drafts"
                ? "bg-neutral-200 text-neutral-900"
                : "bg-neutral-800 text-neutral-400"
            }`}
          >
            {drafts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("published")}
          className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === "published"
              ? "bg-white text-neutral-950 shadow-md font-semibold"
              : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Live Projects</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "published"
                ? "bg-neutral-200 text-neutral-900"
                : "bg-neutral-800 text-neutral-400"
            }`}
          >
            {published.length}
          </span>
        </button>
      </div>

      {/* TAB 1: REPOSITORIES */}
      {activeTab === "repos" && (
        <div>
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search repositories by name or tech..."
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchRepos()}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/80 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            <button
              onClick={fetchRepos}
              disabled={reposLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium rounded-xl border border-neutral-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${reposLoading ? "animate-spin" : ""}`} />
              <span>Refresh Repos</span>
            </button>
          </div>

          {/* Repos Grid */}
          {reposLoading && repos.length === 0 ? (
            <div className="p-16 text-center text-neutral-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-neutral-500" />
              <p>Fetching repositories from GitHub...</p>
            </div>
          ) : repos.length === 0 ? (
            <div className="p-16 text-center bg-neutral-900/40 border border-neutral-800 rounded-2xl text-neutral-400">
              <FolderGit2 className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
              <p className="text-base font-medium text-white mb-1">No repositories found</p>
              <p className="text-sm">Try clearing your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {repos.map((repo) => {
                const isAnalyzing = analyzingRepo === repo.fullName;

                return (
                  <div
                    key={repo.id}
                    className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-700 transition-all duration-200 shadow-md group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors line-clamp-1">
                          {repo.name}
                        </h3>
                        {repo.isPrivate && (
                          <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                            Private
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-neutral-400 line-clamp-2 mb-4 min-h-[2.5rem]">
                        {repo.description || "No description provided."}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mb-6">
                        {repo.language && (
                          <span className="inline-flex items-center gap-1.5 bg-neutral-800/80 text-neutral-300 px-2.5 py-1 rounded-lg border border-neutral-700/60 font-mono">
                            <Code className="w-3 h-3 text-blue-400" />
                            {repo.language}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-neutral-500" />
                          {repo.stars}
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <GitFork className="w-3.5 h-3.5 text-neutral-500" />
                          {repo.forks}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-800/70 flex items-center justify-between gap-3">
                      <div>
                        {repo.importStatus === "published" && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Live on Site
                          </span>
                        )}
                        {repo.importStatus === "draft" && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                            <Sparkles className="w-3.5 h-3.5" />
                            Draft Pending
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleAnalyzeRepo(repo.fullName)}
                        disabled={isAnalyzing}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] ${
                          isAnalyzing
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait"
                            : "bg-white text-neutral-950 hover:bg-neutral-200"
                        }`}
                      >
                        {isAnalyzing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>{repo.importStatus !== "none" ? "Re-Generate" : "Analyze & Draft"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DRAFTS FOR REVIEW */}
      {activeTab === "drafts" && (
        <div>
          {projectsLoading && drafts.length === 0 ? (
            <div className="p-16 text-center text-neutral-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-neutral-500" />
              <p>Loading drafts from Sanity CMS...</p>
            </div>
          ) : drafts.length === 0 ? (
            <div className="p-16 text-center bg-neutral-900/40 border border-neutral-800 rounded-2xl text-neutral-400">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-amber-500/60" />
              <h3 className="text-base font-semibold text-white mb-2">No pending drafts</h3>
              <p className="text-sm max-w-md mx-auto mb-6">
                Go to the Repositories tab and click &quot;Analyze &amp; Draft&quot; on any repository. The AI
                will generate a draft that appears here for your review!
              </p>
              <button
                onClick={() => setActiveTab("repos")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-neutral-950 text-sm font-semibold rounded-xl hover:bg-neutral-200 transition-colors"
              >
                <span>Browse Repositories</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {drafts.map((draft) => (
                <div
                  key={draft._id}
                  className="bg-neutral-900/80 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-amber-500 text-neutral-950 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-sm">
                    Draft Pending Review
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-white">{draft.title.en}</h3>
                        <span className="text-neutral-500 text-sm font-mono">/</span>
                        <h4 className="text-lg font-medium text-neutral-300" dir="rtl">
                          {draft.title.fa}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-neutral-400">
                        <span className="font-mono bg-neutral-800 px-2 py-0.5 rounded">
                          slug: {draft.slug.current}
                        </span>
                        {draft.github && (
                          <a
                            href={draft.github}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:text-white transition-colors"
                          >
                            <Github className="w-3.5 h-3.5" />
                            <span>Repository</span>
                          </a>
                        )}
                        {draft.demo && (
                          <a
                            href={draft.demo}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:text-white transition-colors text-blue-400"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Live Demo</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => handleStartEdit(draft)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Content</span>
                      </button>

                      <button
                        onClick={() => handlePublish(draft._id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.98]"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve &amp; Publish</span>
                      </button>

                      <button
                        onClick={() => handleDelete(draft._id, draft.title.en)}
                        className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                        title="Delete draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-neutral-950/50 rounded-xl border border-neutral-800/80 mb-4 text-sm">
                    <div>
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                        English Description
                      </span>
                      <p className="text-neutral-300 leading-relaxed">{draft.description.en}</p>
                    </div>
                    <div dir="rtl">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                        توضیحات فارسی
                      </span>
                      <p className="text-neutral-300 leading-relaxed">{draft.description.fa}</p>
                    </div>
                  </div>

                  {/* Technologies tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-neutral-500 mr-2">Technologies:</span>
                    {draft.technologies?.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-0.5 rounded-full border border-neutral-700/80 font-mono"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PUBLISHED PROJECTS */}
      {activeTab === "published" && (
        <div>
          {projectsLoading && published.length === 0 ? (
            <div className="p-16 text-center text-neutral-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-neutral-500" />
              <p>Loading published projects from Sanity CMS...</p>
            </div>
          ) : published.length === 0 ? (
            <div className="p-16 text-center bg-neutral-900/40 border border-neutral-800 rounded-2xl text-neutral-400">
              <Layers className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
              <h3 className="text-base font-semibold text-white mb-2">No live projects yet</h3>
              <p className="text-sm">Approve a draft in the Review tab to publish it to your portfolio.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {published.map((proj) => (
                <div
                  key={proj._id}
                  className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-6 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-white">{proj.title.en}</h3>
                      <span className="text-neutral-500 text-sm font-mono">/</span>
                      <h4 className="text-lg font-medium text-neutral-300" dir="rtl">
                        {proj.title.fa}
                      </h4>
                    </div>

                    <p className="text-sm text-neutral-400 max-w-2xl line-clamp-2">
                      {proj.description.en}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {proj.technologies?.map((tech, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md border border-neutral-700/60 font-mono"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={`/${locale}/projects/${proj.slug.current}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View on Site</span>
                    </a>

                    <button
                      onClick={() => handleStartEdit(proj)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleUnpublish(proj._id)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 transition-colors"
                    >
                      <span>To Draft</span>
                    </button>

                    <button
                      onClick={() => handleDelete(proj._id, proj.title.en)}
                      className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT MODAL */}
      {editingProject && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-4xl rounded-2xl shadow-2xl p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Review &amp; Edit Project</h3>
                <p className="text-xs text-neutral-400 font-mono">ID: {editingProject._id}</p>
              </div>

              <button
                onClick={() => {
                  setEditingProject(null);
                  setEditForm(null);
                }}
                className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    English Title
                  </label>
                  <input
                    type="text"
                    value={editForm.title.en}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        title: { ...editForm.title, en: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <div dir="rtl">
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5 text-right">
                    عنوان فارسی
                  </label>
                  <input
                    type="text"
                    value={editForm.title.fa}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        title: { ...editForm.title, fa: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-600 text-right"
                  />
                </div>
              </div>

              {/* Slug, Demo, GitHub */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Slug</label>
                  <input
                    type="text"
                    value={editForm.slug.current}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        slug: { current: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    GitHub URL
                  </label>
                  <input
                    type="text"
                    value={editForm.github}
                    onChange={(e) => setEditForm({ ...editForm, github: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Live Demo URL
                  </label>
                  <input
                    type="text"
                    value={editForm.demo || ""}
                    onChange={(e) => setEditForm({ ...editForm, demo: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>
              </div>

              {/* Technologies */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Technologies (comma separated)
                </label>
                <input
                  type="text"
                  value={editForm.technologies.join(", ")}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      technologies: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-600"
                />
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    English Description
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.description.en}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        description: { ...editForm.description, en: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <div dir="rtl">
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5 text-right">
                    توضیحات فارسی
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.description.fa}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        description: { ...editForm.description, fa: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-600 text-right"
                  />
                </div>
              </div>

              {/* Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Overview (EN)
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.content.overview.en}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        content: {
                          ...editForm.content,
                          overview: { ...editForm.content.overview, en: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <div dir="rtl">
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5 text-right">
                    بررسی اجمالی (FA)
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.content.overview.fa}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        content: {
                          ...editForm.content,
                          overview: { ...editForm.content.overview, fa: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-600 text-right"
                  />
                </div>
              </div>

              {/* Challenges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Challenges (EN)
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.content.challenges.en}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        content: {
                          ...editForm.content,
                          challenges: { ...editForm.content.challenges, en: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <div dir="rtl">
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5 text-right">
                    چالش‌ها (FA)
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.content.challenges.fa}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        content: {
                          ...editForm.content,
                          challenges: { ...editForm.content.challenges, fa: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-600 text-right"
                  />
                </div>
              </div>

              {/* Outcome */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Outcome (EN)
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.content.outcome.en}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        content: {
                          ...editForm.content,
                          outcome: { ...editForm.content.outcome, en: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <div dir="rtl">
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5 text-right">
                    دستاوردها (FA)
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.content.outcome.fa}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        content: {
                          ...editForm.content,
                          outcome: { ...editForm.content.outcome, fa: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-600 text-right"
                  />
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="pt-6 border-t border-neutral-800 mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingProject(null);
                  setEditForm(null);
                }}
                className="px-4 py-2.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-neutral-950 font-semibold text-sm rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-50"
              >
                {savingEdit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
