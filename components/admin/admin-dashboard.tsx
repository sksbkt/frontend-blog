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
  Copy,
  Check,
  BookOpen,
  ShieldCheck,
  FileCode,
  GitPullRequest,
  GitCommit,
  UploadCloud,
  Camera,
  Key,
  EyeOff,
  Terminal,
  Server,
  Video,
  Play,
  Plus,
  Image as ImageIcon,
  Undo2,
  ChevronDown,
  ChevronUp,
  Upload,
} from "lucide-react";
import { FaGithub as Github } from "react-icons/fa";
import { getGitHubOpenGraphUrl } from "@/lib/sanity/mappers";

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

export type ImageAssetRef = {
  _type?: string;
  alt?: string;
  asset?: {
    _id?: string;
    url?: string;
    _ref?: string;
  };
};

export type GalleryItem = {
  _key: string;
  _type?: string;
  caption?: string;
  alt?: string;
  asset?: {
    _id?: string;
    url?: string;
    _ref?: string;
  };
};

export type ProjectVideo = {
  enabled: boolean;
  url?: string;
  asset?: {
    _id?: string;
    url?: string;
    _ref?: string;
  };
};

export type ProjectPreviewGif = {
  enabled?: boolean;
  asset?: {
    _id?: string;
    url?: string;
    _ref?: string;
  };
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
  image?: ImageAssetRef;
  coverImage?: ImageAssetRef;
  gallery?: GalleryItem[];
  video?: ProjectVideo;
  previewGif?: ProjectPreviewGif;
};

export type EnvVariableDef = {
  key: string;
  required: boolean;
  description: string;
  isSecret: boolean;
};

type RepoAuditData = {
  overallScore: number;
  documentationStatus: "missing" | "basic" | "good" | "comprehensive";
  requiresEnv?: boolean;
  envVariables?: EnvVariableDef[];
  summary: { en: string; fa: string };
  strengths: { en: string[]; fa: string[] };
  improvements: { en: string[]; fa: string[] };
  techStackHighlights: string[];
  bilingualReadmeDraft: string;
};

type RepoAuditItem = {
  audit?: RepoAuditData | null;
  readmeDraft?: string | null;
  context?: {
    fullName?: string;
    hasReadme: boolean;
    readmeSize?: number;
    totalFiles: number;
    configFiles: string[];
    entryPoint: string | null;
    defaultBranch?: string;
    hasPackageJson?: boolean;
    detectedEnvKeys?: string[];
  };
};

type PushReadmeConfig = {
  fullName: string;
  content: string;
  mode: "direct" | "pr";
  targetBranch: string;
  branchName: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
};

type PushSuccessResult = {
  commitUrl?: string;
  pullRequestUrl?: string;
  pullRequestNumber?: number;
  branch: string;
  mode: "direct" | "pr";
  message: string;
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

  // Audit & README state
  const [repoAudits, setRepoAudits] = useState<Record<string, RepoAuditItem>>({});
  const [auditingRepo, setAuditingRepo] = useState<string | null>(null);
  const [viewingAudit, setViewingAudit] = useState<{
    repoName: string;
    audit: RepoAuditData;
    readmeDraft?: string | null;
    context?: RepoAuditItem["context"];
  } | null>(null);
  const [auditDialogTab, setAuditDialogTab] = useState<"audit" | "readme">("audit");
  const [copiedReadme, setCopiedReadme] = useState(false);

  // Reverse Sync / Push to GitHub state
  const [pushingReadmeConfig, setPushingReadmeConfig] = useState<PushReadmeConfig | null>(null);
  const [isPushingReadme, setIsPushingReadme] = useState(false);
  const [pushSuccessResult, setPushSuccessResult] = useState<PushSuccessResult | null>(null);
  const [deployingAssetRunner, setDeployingAssetRunner] = useState<string | null>(null);

  // Vercel Deployment & Environment Variable state
  const [envModalConfig, setEnvModalConfig] = useState<{
    repoFullName: string;
    branch?: string;
    envVariables: EnvVariableDef[];
  } | null>(null);
  const [envFormValues, setEnvFormValues] = useState<Record<string, string>>({});
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [isDeployingVercel, setIsDeployingVercel] = useState(false);
  const [vercelDeployStatus, setVercelDeployStatus] = useState<string | null>(null);
  const [vercelDeployResult, setVercelDeployResult] = useState<{
    liveUrl: string;
    deploymentId: string;
    projectId: string;
    message?: string;
  } | null>(null);
  const [newEnvKey, setNewEnvKey] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Editing state
  const [editingProject, setEditingProject] = useState<SanityProject | null>(null);
  const [editForm, setEditForm] = useState<SanityProject | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editModalTab, setEditModalTab] = useState<"general" | "content" | "media" | "audit">("general");
  const [newTechTag, setNewTechTag] = useState("");
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [isSyncingAssets, setIsSyncingAssets] = useState(false);
  const [newImageCaption, setNewImageCaption] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [videoCollapsibleOpen, setVideoCollapsibleOpen] = useState(true);

  // Load persisted audits
  useEffect(() => {
    try {
      const saved = localStorage.getItem("portfolio_admin_repo_audits");
      if (saved) {
        setRepoAudits(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const updateAuditData = (repoKey: string, data: RepoAuditItem) => {
    setRepoAudits((prev) => {
      const next = { ...prev, [repoKey.toLowerCase()]: data };
      try {
        localStorage.setItem("portfolio_admin_repo_audits", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Close modals on Escape
  useEffect(() => {
    if (!editingProject && !viewingAudit && !pushingReadmeConfig && !envModalConfig) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (envModalConfig) {
          if (!isDeployingVercel) {
            setEnvModalConfig(null);
            setVercelDeployResult(null);
          }
        } else if (pushingReadmeConfig) {
          if (!isPushingReadme) {
            setPushingReadmeConfig(null);
            setPushSuccessResult(null);
          }
        } else if (viewingAudit) {
          setViewingAudit(null);
        } else if (editingProject) {
          setEditingProject(null);
          setEditForm(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingProject, viewingAudit, pushingReadmeConfig, isPushingReadme, envModalConfig, isDeployingVercel]);

  const handleCopyReadme = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReadme(true);
    setTimeout(() => setCopiedReadme(false), 2000);
    showToast("README.md draft copied to clipboard!", "success");
  };

  // Open the Push / Reverse Sync dialog
  const handleOpenPushModal = (repoNameOrUrl: string, initialContent?: string) => {
    let cleanFullName = (repoNameOrUrl || "").trim();
    if (cleanFullName.startsWith("http")) {
      cleanFullName = cleanFullName
        .replace(/^https?:\/\/github\.com\//, "")
        .replace(/\.git$/, "");
    }

    // Defensive resolution: If cleanFullName does not contain '/', resolve owner/repo
    if (!cleanFullName.includes("/")) {
      // 1. Try matching against drafts or published projects
      const matchedProject = [...drafts, ...published].find(
        (p) =>
          p.title?.en?.toLowerCase() === cleanFullName.toLowerCase() ||
          p.title?.fa?.toLowerCase() === cleanFullName.toLowerCase() ||
          p.slug?.current?.toLowerCase() === cleanFullName.toLowerCase() ||
          p._id === cleanFullName
      );
      if (matchedProject?.github) {
        const fromGithub = matchedProject.github
          .replace(/^https?:\/\/github\.com\//, "")
          .replace(/\.git$/, "")
          .trim();
        if (fromGithub.includes("/")) {
          cleanFullName = fromGithub;
        }
      }

      // 2. Try matching against fetched repositories
      if (!cleanFullName.includes("/")) {
        const matchedRepo = repos.find(
          (r) =>
            r.name.toLowerCase() === cleanFullName.toLowerCase() ||
            r.fullName.toLowerCase() === cleanFullName.toLowerCase()
        );
        if (matchedRepo?.fullName) {
          cleanFullName = matchedRepo.fullName;
        }
      }

      // 3. Try matching against known repoAudits keys
      if (!cleanFullName.includes("/")) {
        const auditKey = Object.keys(repoAudits).find(
          (k) =>
            k === cleanFullName.toLowerCase() ||
            k.endsWith("/" + cleanFullName.toLowerCase())
        );
        if (auditKey && auditKey.includes("/")) {
          cleanFullName = auditKey;
        }
      }
    }

    if (!cleanFullName || !cleanFullName.includes("/")) {
      showToast(
        "Could not determine valid GitHub repository (owner/repo). Please ensure a valid repository is linked.",
        "error"
      );
      return;
    }

    let content = initialContent || "";
    if (!content) {
      const item = repoAudits[cleanFullName.toLowerCase()];
      if (item?.readmeDraft) {
        content = item.readmeDraft;
      }
    }

    if (!content) {
      showToast("No README draft found. Please run an AI audit first.", "error");
      return;
    }

    const defaultBranch =
      repoAudits[cleanFullName.toLowerCase()]?.context?.defaultBranch || "main";
    const timestamp = Date.now().toString(36);
    setPushSuccessResult(null);
    setPushingReadmeConfig({
      fullName: cleanFullName,
      content,
      mode: "direct",
      targetBranch: defaultBranch,
      branchName: `docs/bilingual-readme-${timestamp}`,
      commitMessage: "docs: add bilingual README.md (English & Persian) via Admin Studio",
      prTitle: "docs: update bilingual README.md (English & Persian)",
      prBody: `### Bilingual Documentation Update 🌐\n\nThis pull request updates \`README.md\` with a comprehensive bilingual (English & Persian) overview, setup instructions, and architecture highlights.\n\n*Generated and synced via Admin Studio with Google Gemini.*`,
    });
  };

  // Execute commit/PR to GitHub
  const handleExecutePushReadme = async () => {
    if (!pushingReadmeConfig) return;
    setIsPushingReadme(true);
    try {
      const res = await fetch("/api/admin/github/sync-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pushingReadmeConfig),
      });
      const data = await res.json();
      if (data.success) {
        setPushSuccessResult({
          commitUrl: data.commitUrl,
          pullRequestUrl: data.pullRequest?.htmlUrl,
          pullRequestNumber: data.pullRequest?.number,
          branch: data.branch,
          mode: data.mode,
          message: data.message,
        });
        showToast(data.message || "README successfully pushed to GitHub!", "success");
      } else {
        showToast(data.message || "Failed to push README to GitHub.", "error");
      }
    } catch {
      showToast("Network error syncing README to GitHub.", "error");
    } finally {
      setIsPushingReadme(false);
    }
  };

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
        if (data.audit) {
          updateAuditData(fullName.toLowerCase(), {
            audit: data.audit,
            readmeDraft: data.readmeDraft,
            context: data.context,
          });
        }
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

  // Run on-demand AI code audit
  const handleRunAudit = async (fullName: string) => {
    setAuditingRepo(fullName);
    showToast(`Auditing ${fullName} with AI... Inspecting files & README.`, "success");

    try {
      const res = await fetch("/api/admin/github/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });

      const data = await res.json();
      if (data.success && data.audit) {
        updateAuditData(fullName.toLowerCase(), {
          audit: data.audit,
          readmeDraft: data.readmeDraft,
          context: data.context,
        });
        setViewingAudit({
          repoName: fullName,
          audit: data.audit,
          readmeDraft: data.readmeDraft,
          context: data.context,
        });
        showToast(`Audit complete for ${fullName}! Score: ${data.audit.overallScore}/100`, "success");
      } else {
        showToast(data.message || "Audit failed.", "error");
      }
    } catch {
      showToast("Failed to audit repository. Check network.", "error");
    } finally {
      setAuditingRepo(null);
    }
  };

  // Open Environment Variables & Vercel Deployment Modal
  const handleOpenEnvModal = (fullName: string, envVariables?: EnvVariableDef[], branch?: string) => {
    let cleanFullName = fullName.trim();
    if (cleanFullName.startsWith("http")) {
      cleanFullName = cleanFullName.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
    }

    const auditItem = repoAudits[cleanFullName.toLowerCase()];
    const vars: EnvVariableDef[] = (envVariables && envVariables.length > 0)
      ? envVariables
      : (auditItem?.audit?.envVariables && auditItem.audit.envVariables.length > 0)
        ? auditItem.audit.envVariables
        : (auditItem?.context?.detectedEnvKeys || []).map((k) => ({
            key: k,
            required: true,
            description: "Environment variable detected from codebase references.",
            isSecret: /key|secret|token|pass|auth|pwd|cred/i.test(k),
          }));

    const initialVals: Record<string, string> = { ...envFormValues };
    vars.forEach((v) => {
      if (initialVals[v.key] === undefined) {
        initialVals[v.key] = "";
      }
    });

    setEnvFormValues(initialVals);
    setVercelDeployResult(null);
    setVercelDeployStatus(null);
    setEnvModalConfig({
      repoFullName: cleanFullName,
      branch: branch || auditItem?.context?.defaultBranch || "main",
      envVariables: vars,
    });
  };

  // Execute Vercel Deployment & Trigger Capture
  const handleExecuteVercelDeploy = async () => {
    if (!envModalConfig) return;
    setIsDeployingVercel(true);
    setVercelDeployStatus("Initiating Vercel deployment pipeline...");
    showToast(`Deploying ${envModalConfig.repoFullName} to Vercel...`, "success");

    try {
      const envVarsPayload = envModalConfig.envVariables
        .map((v) => ({
          key: v.key.trim(),
          value: (envFormValues[v.key] || "").trim(),
          isSecret: v.isSecret,
        }))
        .filter((v) => v.value.length > 0);

      setVercelDeployStatus("Linking GitHub repository and provisioning encrypted variables...");

      const res = await fetch("/api/admin/vercel/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: envModalConfig.repoFullName,
          branch: envModalConfig.branch || "main",
          envVars: envVarsPayload,
          triggerCapture: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.liveUrl) {
        setVercelDeployResult({
          liveUrl: data.liveUrl,
          deploymentId: data.deploymentId,
          projectId: data.projectId,
          message: data.message,
        });
        showToast(`Successfully deployed to ${data.liveUrl}! Visual capture launched.`, "success");
        await fetchProjects();
      } else {
        showToast(data.message || "Vercel deployment failed.", "error");
        setVercelDeployStatus(`Deployment failed: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Vercel deployment error:", err);
      showToast("Network error executing Vercel deployment.", "error");
      setVercelDeployStatus("Network error executing Vercel deployment.");
    } finally {
      setIsDeployingVercel(false);
    }
  };

  // Deploy visual asset capture workflow to target repository & dispatch run
  const handleDeployAssetRunner = async (fullName: string) => {
    const auditItem = repoAudits[fullName.toLowerCase()];

    // Pipeline Guard: If repository requires env variables and does not yet have a live demo, halt asset generation
    if (auditItem?.audit?.requiresEnv) {
      const matchingProject = [...drafts, ...published].find((p) =>
        p.github.toLowerCase().includes(fullName.toLowerCase())
      );
      if (!matchingProject?.demo) {
        showToast("Repository requires environment variables before visual capture. Please configure below.", "error");
        handleOpenEnvModal(fullName, auditItem.audit.envVariables);
        return;
      }
    }

    setDeployingAssetRunner(fullName);
    showToast(`Deploying visual capture workflow to ${fullName}...`, "success");

    try {
      const res = await fetch("/api/admin/github/deploy-asset-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, triggerRun: true }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          data.message || `Visual capture workflow deployed & triggered on ${fullName}!`,
          "success"
        );
      } else {
        showToast(data.message || "Failed to deploy visual asset workflow.", "error");
      }
    } catch {
      showToast("Network error deploying visual asset workflow.", "error");
    } finally {
      setDeployingAssetRunner(null);
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
  const handleStartEdit = (
    proj: SanityProject,
    initialTab: "general" | "content" | "media" | "audit" = "general"
  ) => {
    setEditingProject(proj);
    setEditForm(JSON.parse(JSON.stringify(proj)));
    setEditModalTab(initialTab);
    setNewTechTag("");
  };

  // Save edit form
  const handleSaveEdit = async () => {
    if (!editForm || !editingProject) return;
    setSavingEdit(true);

    try {
      // Default Cover Rule: If no custom cover image has been explicitly chosen, default to GitHub OpenGraph image
      let coverToSave = editForm.coverImage;
      if ((!coverToSave || !coverToSave.asset?.url) && editForm.github) {
        const ogUrl = getGitHubOpenGraphUrl(editForm.github);
        if (ogUrl) {
          coverToSave = {
            _type: "image",
            alt: `${editForm.title.en} OpenGraph Cover`,
            asset: {
              url: ogUrl,
            },
          };
        }
      }

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
            coverImage: coverToSave,
            gallery: editForm.gallery,
            video: editForm.video,
            previewGif: editForm.previewGif,
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

  // Sync assets from GitHub action output for project
  const handleSyncProjectAssets = async (projectId?: string, githubUrl?: string) => {
    const rawGithub = githubUrl || editForm?.github;
    if (!rawGithub) {
      showToast("Project does not have a GitHub repository URL linked.", "error");
      return;
    }

    const cleanFullName = rawGithub
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\.git$/, "")
      .trim();

    setIsSyncingAssets(true);
    showToast(`Syncing screenshots & GIF from ${cleanFullName}...`, "success");

    try {
      const res = await fetch("/api/admin/projects/sync-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: cleanFullName,
          projectId: projectId || editingProject?._id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Assets synced successfully to project!", "success");
        await fetchProjects();
        // If we are currently editing this project, refresh editForm
        if (editingProject && (!projectId || projectId === editingProject._id)) {
          const updatedProjects = await fetch("/api/admin/projects").then((r) => r.json());
          const matching = (updatedProjects.all || []).find((p: SanityProject) => p._id === editingProject._id);
          if (matching) {
            setEditForm(JSON.parse(JSON.stringify(matching)));
          }
        }
      } else {
        showToast(data.message || "Failed to sync assets.", "error");
      }
    } catch {
      showToast("Network error syncing assets from GitHub.", "error");
    } finally {
      setIsSyncingAssets(false);
    }
  };

  // Upload manual image or video file
  const handleUploadProjectAsset = async (file: File, isVideo: boolean = false) => {
    if (!file || !editingProject || !editForm) return;

    setIsUploadingAsset(true);
    showToast(`Uploading ${file.name}...`, "success");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", editingProject._id);
      formData.append("caption", newImageCaption || file.name.replace(/\.[^/.]+$/, ""));

      const res = await fetch("/api/admin/projects/upload-asset", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showToast("Asset uploaded successfully!", "success");
        setNewImageCaption("");

        // Update editForm state locally
        if (isVideo) {
          setEditForm({
            ...editForm,
            video: {
              enabled: true,
              url: editForm.video?.url,
              asset: {
                _id: data.asset._id,
                url: data.asset.url,
              },
            },
          });
        } else if (data.galleryItem) {
          const updatedGallery = [...(editForm.gallery || []), {
            _key: data.galleryItem._key || `gallery-${Date.now()}`,
            caption: data.galleryItem.caption,
            alt: data.galleryItem.alt,
            asset: {
              _id: data.asset._id,
              url: data.asset.url,
              _ref: data.asset._id,
            },
          }];
          setEditForm({
            ...editForm,
            gallery: updatedGallery,
            coverImage: editForm.coverImage || {
              _type: "image",
              alt: data.galleryItem.caption,
              asset: {
                _id: data.asset._id,
                url: data.asset.url,
                _ref: data.asset._id,
              },
            },
          });
        }
        await fetchProjects();
      } else {
        showToast(data.message || "Failed to upload asset.", "error");
      }
    } catch {
      showToast("Network error uploading asset.", "error");
    } finally {
      setIsUploadingAsset(false);
    }
  };

  // Upload multiple images/videos via drag & drop or multi-file picker
  const handleUploadMultipleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0 || !editingProject || !editForm) return;

    const fileList = Array.from(files).filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );

    if (fileList.length === 0) {
      showToast("Please drop or select valid image or video files.", "error");
      return;
    }

    setIsUploadingAsset(true);
    setUploadProgress({ current: 0, total: fileList.length });

    let currentGallery = [...(editForm.gallery || [])];
    let currentCover = editForm.coverImage;
    let successCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setUploadProgress({ current: i + 1, total: fileList.length });
      const isVideo = file.type.startsWith("video/");

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", editingProject._id);
        formData.append("caption", newImageCaption || file.name.replace(/\.[^/.]+$/, ""));

        const res = await fetch("/api/admin/projects/upload-asset", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          successCount++;
          if (isVideo) {
            setEditForm((prev) =>
              prev
                ? {
                    ...prev,
                    video: {
                      enabled: true,
                      url: prev.video?.url,
                      asset: {
                        _id: data.asset._id,
                        url: data.asset.url,
                      },
                    },
                  }
                : null
            );
          } else if (data.galleryItem) {
            const newItem: GalleryItem = {
              _key: data.galleryItem._key || `gallery-${Date.now()}-${i}`,
              caption: data.galleryItem.caption || file.name,
              alt: data.galleryItem.alt || file.name,
              asset: {
                _id: data.asset._id,
                url: data.asset.url,
                _ref: data.asset._id,
              },
            };
            currentGallery.push(newItem);
            if (!currentCover?.asset?.url) {
              currentCover = {
                _type: "image",
                alt: newItem.caption,
                asset: {
                  _id: data.asset._id,
                  url: data.asset.url,
                  _ref: data.asset._id,
                },
              };
            }
          }
        }
      } catch (err) {
        console.error("Upload error for file:", file.name, err);
      }
    }

    setEditForm((prev) =>
      prev
        ? {
            ...prev,
            gallery: currentGallery,
            coverImage: currentCover,
          }
        : null
    );

    setNewImageCaption("");
    setIsUploadingAsset(false);
    setUploadProgress(null);

    if (successCount > 0) {
      showToast(`Successfully uploaded ${successCount} of ${fileList.length} media file(s)!`, "success");
      await fetchProjects();
    } else {
      showToast("Failed to upload media files.", "error");
    }
  };

  // Set gallery item as primary cover image
  const handleSetAsCover = (item: GalleryItem) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      coverImage: {
        _type: "image",
        alt: item.caption || item.alt || "Cover Image",
        asset: {
          _id: item.asset?._id,
          url: item.asset?.url,
          _ref: item.asset?._id || item.asset?._ref,
        },
      },
    });
    showToast(`Set "${item.caption || "screenshot"}" as primary cover image!`, "success");
  };

  // Set GitHub OpenGraph card as primary cover image
  const handleSetOpenGraphCover = (ogUrl: string) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      coverImage: {
        _type: "image",
        alt: `${editForm.title.en} GitHub OpenGraph Social Card`,
        asset: {
          url: ogUrl,
        },
      },
    });
    showToast("Set GitHub OpenGraph card as primary cover image!", "success");
  };

  // Set animated preview GIF as primary cover image
  const handleSetPreviewGifCover = (gifUrl: string) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      coverImage: {
        _type: "image",
        alt: `${editForm.title.en} Animated Preview GIF`,
        asset: {
          url: gifUrl,
        },
      },
    });
    showToast("Set animated preview GIF as primary cover image!", "success");
  };

  // Remove individual image from gallery
  const handleRemoveGalleryItem = (keyToRemove: string) => {
    if (!editForm) return;
    const filtered = (editForm.gallery || []).filter((g) => g._key !== keyToRemove);
    setEditForm({
      ...editForm,
      gallery: filtered,
    });
    showToast("Image removed from gallery.", "success");
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

          {/* Repos Grid with Contextual Skeleton Loader */}
          {reposLoading && repos.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 flex flex-col justify-between animate-pulse"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="h-5 w-40 bg-neutral-800 rounded-md" />
                      <div className="h-6 w-20 bg-neutral-800 rounded-full" />
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="h-3.5 w-full bg-neutral-800/60 rounded" />
                      <div className="h-3.5 w-2/3 bg-neutral-800/60 rounded" />
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-5 w-20 bg-neutral-800 rounded-lg" />
                      <div className="h-4 w-12 bg-neutral-800/80 rounded" />
                      <div className="h-4 w-12 bg-neutral-800/80 rounded" />
                    </div>
                  </div>
                  <div className="pt-3.5 border-t border-neutral-800/70 flex flex-col gap-2.5">
                    <div className="h-6 w-24 bg-neutral-800/60 rounded-md" />
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-20 bg-neutral-800 rounded-xl" />
                      <div className="h-9 w-20 bg-neutral-800 rounded-xl" />
                      <div className="h-9 w-20 bg-neutral-800 rounded-xl" />
                      <div className="h-9 flex-1 bg-neutral-800 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
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
                const normalizedRepoUrl = repo.url.toLowerCase().replace(/\.git$/, "");
                const matchingPublished = published.find(
                  (p) => p.github?.trim().toLowerCase().replace(/\.git$/, "") === normalizedRepoUrl
                );
                const matchingDraft = drafts.find(
                  (p) => p.github?.trim().toLowerCase().replace(/\.git$/, "") === normalizedRepoUrl
                );

                const isCiCapturing = deployingAssetRunner === repo.fullName;
                const auditItem = repoAudits[repo.fullName.toLowerCase()];
                const needsEnv = auditItem?.audit?.requiresEnv;

                return (
                  <div
                    key={repo.id}
                    className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-700 transition-all duration-200 shadow-md group"
                  >
                    <div>
                      {/* Card Header: Title + Status Badge + Single Crisp External Link */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <h3
                            className="font-bold text-white text-base truncate"
                            title={repo.fullName}
                          >
                            {repo.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Clean Status Badge Indicator */}
                          {isCiCapturing ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              <RefreshCw className="w-3 h-3 animate-spin text-purple-400" />
                              <span>In CI Capture</span>
                            </span>
                          ) : needsEnv ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEnvModal(repo.fullName, auditItem?.audit?.envVariables)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors"
                              title="Awaiting environment configuration"
                            >
                              <Lock className="w-3 h-3 text-amber-400" />
                              <span>Awaiting Config</span>
                            </button>
                          ) : repo.importStatus === "published" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                              <span>Deployed</span>
                            </span>
                          ) : repo.importStatus === "draft" ? (
                            <button
                              type="button"
                              onClick={() => setActiveTab("drafts")}
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors"
                              title="Draft pending review in CMS"
                            >
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>Draft</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono text-neutral-400 bg-neutral-800/80 border border-neutral-700/60">
                              Not Imported
                            </span>
                          )}

                          {/* External Links Tucked Cleanly into Card Header */}
                          {matchingPublished && (
                            <a
                              href={`/${locale}/projects/${matchingPublished.slug.current}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 rounded-lg transition-colors"
                              title="View live portfolio project"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                            title="View GitHub repository"
                          >
                            <Github className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      <p className="text-sm text-neutral-400 line-clamp-2 mb-4 min-h-[2.5rem]">
                        {repo.description || "No description provided."}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mb-6">
                        {repo.language && (
                          <span className="inline-flex items-center gap-1.5 bg-neutral-800/80 text-neutral-300 px-2.5 py-1 rounded-lg border border-neutral-700/60 font-mono">
                            <Code className="w-3.5 h-3.5 text-blue-400" />
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

                        {repo.isPrivate && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
                            Private
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-neutral-800/70 flex flex-col gap-2.5">
                      {/* Upper Tier: Quick Edit Context & Audit Score */}
                      <div className="flex items-center justify-between gap-2 min-h-[26px]">
                        <div>
                          {matchingPublished && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(matchingPublished, "content")}
                              className="text-xs text-neutral-400 hover:text-white inline-flex items-center gap-1.5 transition-colors group/edit"
                              title="Edit project details & media"
                            >
                              <Edit3 className="w-3 h-3 text-neutral-500 group-hover/edit:text-emerald-400" />
                              <span>Edit Details</span>
                            </button>
                          )}
                          {!matchingPublished && matchingDraft && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(matchingDraft, "content")}
                              className="text-xs text-neutral-400 hover:text-white inline-flex items-center gap-1.5 transition-colors group/edit"
                              title="Edit draft details & media"
                            >
                              <Edit3 className="w-3 h-3 text-neutral-500 group-hover/edit:text-amber-400" />
                              <span>Edit Draft</span>
                            </button>
                          )}
                          {!matchingPublished && !matchingDraft && (
                            <span className="text-[11px] text-neutral-500 font-mono">
                              Ready for analysis
                            </span>
                          )}
                        </div>

                        <div>
                          {auditItem?.audit && (
                            <button
                              type="button"
                              onClick={() => {
                                setViewingAudit({
                                  repoName: repo.fullName,
                                  audit: auditItem.audit!,
                                  readmeDraft: auditItem.readmeDraft,
                                  context: auditItem.context,
                                });
                                setAuditDialogTab("audit");
                              }}
                              className="h-6 px-2 inline-flex items-center justify-center gap-1 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 text-[11px] font-semibold rounded-md border border-blue-800/50 transition-colors"
                              title="View AI audit report"
                            >
                              <ShieldCheck className="w-3 h-3 text-blue-400" />
                              <span>Score {auditItem.audit.overallScore}/100</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lower Tier: Action Hierarchy (Secondary Outlines + Primary Standalone) */}
                      <div className="flex items-center gap-2">
                        {/* Secondary 1: Vercel Deploy / Env Config */}
                        <button
                          type="button"
                          onClick={() => handleOpenEnvModal(repo.fullName, auditItem?.audit?.envVariables)}
                          disabled={isDeployingVercel && envModalConfig?.repoFullName === repo.fullName}
                          className="h-9 px-3 shrink-0 inline-flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl border border-neutral-700/80 transition-colors disabled:opacity-50"
                          title="Configure environment variables & deploy to Vercel"
                        >
                          <Server className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="leading-none">Vercel</span>
                        </button>

                        {/* Secondary 2: Capture Visual Assets */}
                        <button
                          type="button"
                          onClick={() => handleDeployAssetRunner(repo.fullName)}
                          disabled={isCiCapturing || isAnalyzing}
                          className="h-9 px-3 shrink-0 inline-flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl border border-neutral-700/80 transition-colors disabled:opacity-50"
                          title="Deploy visual capture workflow to this repo and trigger GitHub Actions run"
                        >
                          {isCiCapturing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
                          ) : (
                            <Camera className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          )}
                          <span className="leading-none">Capture</span>
                        </button>

                        {/* Secondary 3: AI Code Audit */}
                        <button
                          type="button"
                          onClick={() => handleRunAudit(repo.fullName)}
                          disabled={auditingRepo === repo.fullName || isAnalyzing}
                          className="h-9 px-3 shrink-0 inline-flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl border border-neutral-700/80 transition-colors disabled:opacity-50"
                          title="Run AI structure audit & generate README"
                        >
                          {auditingRepo === repo.fullName ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          )}
                          <span className="leading-none">Audit</span>
                        </button>

                        {/* Primary Action: Standalone High-Contrast Button */}
                        <button
                          type="button"
                          onClick={() => handleAnalyzeRepo(repo.fullName)}
                          disabled={isAnalyzing}
                          className={`h-9 px-3.5 flex-1 min-w-0 inline-flex items-center justify-center gap-2 text-xs font-bold rounded-xl shadow-md transition-all active:scale-[0.98] ${
                            isAnalyzing
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait"
                              : "bg-white text-neutral-950 hover:bg-neutral-100 font-bold"
                          }`}
                          title={repo.importStatus !== "none" ? "Re-generate project draft" : "Analyze repo and create project draft"}
                        >
                          {isAnalyzing ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                              <span className="truncate leading-none">Analyzing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="truncate leading-none">
                                {repo.importStatus !== "none" ? "Re-Generate" : "Analyze & Draft"}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
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
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 animate-pulse flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-48 bg-neutral-800 rounded-md" />
                      <div className="h-5 w-24 bg-neutral-800/60 rounded-full" />
                    </div>
                    <div className="h-4 w-3/4 bg-neutral-800/70 rounded" />
                    <div className="flex items-center gap-2 pt-2">
                      <div className="h-5 w-16 bg-neutral-800 rounded" />
                      <div className="h-5 w-16 bg-neutral-800 rounded" />
                      <div className="h-5 w-16 bg-neutral-800 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-9 w-24 bg-neutral-800 rounded-xl" />
                    <div className="h-9 w-24 bg-neutral-800 rounded-xl" />
                    <div className="h-9 w-36 bg-neutral-800 rounded-xl" />
                  </div>
                </div>
              ))}
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
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-bold text-white">{draft.title.en}</h3>
                        <span className="text-neutral-500 text-sm font-mono">/</span>
                        <h4 className="text-lg font-medium text-neutral-300" dir="rtl">
                          {draft.title.fa}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
                        <span className="font-mono bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">
                          slug: {draft.slug.current}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
                      {/* Header Status Badge */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Draft Pending</span>
                      </span>

                      {/* Header Crisp External Links */}
                      {draft.github && (
                        <a
                          href={draft.github}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors border border-neutral-800"
                          title="View GitHub repository"
                        >
                          <Github className="w-4 h-4" />
                        </a>
                      )}
                      {draft.demo && (
                        <a
                          href={draft.demo}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-neutral-400 hover:text-blue-400 hover:bg-neutral-800 rounded-xl transition-colors border border-neutral-800"
                          title="Open live demo"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
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
                  <div className="flex flex-wrap items-center gap-2 mb-6">
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

                  {/* Actions Bar: Clear Hierarchy */}
                  <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {draft.github && (
                        <button
                          type="button"
                          onClick={() => handleOpenEnvModal(draft.github)}
                          className="h-9 px-3.5 inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl border border-neutral-700/80 transition-colors shadow-sm"
                          title="Configure environment variables & deploy to Vercel"
                        >
                          <Server className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="leading-none">Vercel</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStartEdit(draft, "content")}
                        className="h-9 px-3.5 inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700/80 transition-colors shadow-sm"
                        title="Edit draft content, media & metadata"
                      >
                        <Edit3 className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                        <span className="leading-none">Edit Content</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Standalone High-Contrast Primary Action */}
                      <button
                        type="button"
                        onClick={() => handlePublish(draft._id)}
                        className="h-9 px-4 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.98]"
                        title="Approve and publish project to live portfolio"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="leading-none">Approve &amp; Publish</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(draft._id, draft.title.en)}
                        className="h-9 w-9 inline-flex items-center justify-center text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-neutral-800 hover:border-red-500/20 transition-colors shadow-sm"
                        title="Delete draft"
                        aria-label="Delete draft"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* AI Audit & README Widget */}
                  {(() => {
                    const draftRepoKey = draft.github
                      ? draft.github.toLowerCase().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "")
                      : "";
                    const draftRepoFullName = draft.github
                      ? draft.github.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "")
                      : draftRepoKey;
                    const auditItem = draftRepoKey ? repoAudits[draftRepoKey] : undefined;

                    if (auditItem?.audit) {
                      return (
                        <div className="mt-5 pt-4 border-t border-neutral-800/80 bg-neutral-950/40 rounded-xl p-4 border border-neutral-800/60">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-white uppercase tracking-wider">
                                  AI Code Audit
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    auditItem.audit.overallScore >= 80
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                      : auditItem.audit.overallScore >= 60
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                      : "bg-red-500/10 text-red-400 border-red-500/30"
                                  }`}
                                >
                                  Score: {auditItem.audit.overallScore}/100
                                </span>
                                <span className="text-[10px] text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700/60">
                                  README: {auditItem.audit.documentationStatus}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {auditItem.readmeDraft && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPushModal(draftRepoFullName || draftRepoKey, auditItem.readmeDraft!)}
                                    className="h-8.5 px-3.5 inline-flex items-center justify-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/30 transition-colors shadow-sm"
                                    title="Approve and push this README directly to GitHub or via a Pull Request"
                                  >
                                    <UploadCloud className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                                    <span className="leading-none">Approve &amp; Push</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewingAudit({
                                        repoName: draftRepoFullName || draftRepoKey || draft.title.en,
                                        audit: auditItem.audit!,
                                        readmeDraft: auditItem.readmeDraft,
                                        context: auditItem.context,
                                      });
                                      setAuditDialogTab("readme");
                                    }}
                                    className="h-8.5 px-3.5 inline-flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-700 transition-colors shadow-sm"
                                    title="View generated bilingual README draft"
                                  >
                                    <BookOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                    <span className="leading-none">View README</span>
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setViewingAudit({
                                    repoName: draftRepoFullName || draftRepoKey || draft.title.en,
                                    audit: auditItem.audit!,
                                    readmeDraft: auditItem.readmeDraft,
                                    context: auditItem.context,
                                  });
                                  setAuditDialogTab("audit");
                                }}
                                className="h-8.5 px-3.5 inline-flex items-center justify-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold rounded-lg border border-blue-500/30 transition-colors shadow-sm"
                                title="Inspect detailed repository audit results"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                                <span className="leading-none">Audit Details</span>
                              </button>
                            </div>
                          </div>

                          {/* Quick highlights */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-3">
                            <div className="bg-neutral-900/60 p-3 rounded-lg border border-neutral-800/60">
                              <span className="font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5" /> Strengths
                              </span>
                              <ul className="space-y-1 text-neutral-300">
                                {auditItem.audit.strengths.en.slice(0, 2).map((s, i) => (
                                  <li key={i} className="flex items-start gap-1.5 line-clamp-1">
                                    <span className="text-emerald-500 font-bold">•</span>
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="bg-neutral-900/60 p-3 rounded-lg border border-neutral-800/60">
                              <span className="font-semibold text-amber-400 mb-1.5 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" /> Recommended Improvements
                              </span>
                              <ul className="space-y-1 text-neutral-300">
                                {auditItem.audit.improvements.en.slice(0, 2).map((s, i) => (
                                  <li key={i} className="flex items-start gap-1.5 line-clamp-1">
                                    <span className="text-amber-500 font-bold">•</span>
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (draftRepoKey) {
                      return (
                        <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between gap-3 text-xs text-neutral-400">
                          <span>AI Code Audit &amp; README draft available for this repository.</span>
                          <button
                            type="button"
                            onClick={() => handleRunAudit(draftRepoKey)}
                            disabled={auditingRepo === draftRepoKey}
                            className="h-8 px-3 inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium rounded-lg border border-neutral-700/80 transition-colors"
                          >
                            {auditingRepo === draftRepoKey ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                            )}
                            <span>Generate Audit &amp; README</span>
                          </button>
                        </div>
                      );
                    }

                    return null;
                  })()}
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
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 animate-pulse flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-48 bg-neutral-800 rounded-md" />
                      <div className="h-5 w-24 bg-neutral-800/60 rounded-full" />
                    </div>
                    <div className="h-4 w-3/4 bg-neutral-800/70 rounded" />
                    <div className="flex items-center gap-2 pt-2">
                      <div className="h-5 w-16 bg-neutral-800 rounded" />
                      <div className="h-5 w-16 bg-neutral-800 rounded" />
                      <div className="h-5 w-16 bg-neutral-800 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-9 w-24 bg-neutral-800 rounded-xl" />
                    <div className="h-9 w-24 bg-neutral-800 rounded-xl" />
                    <div className="h-9 w-36 bg-neutral-800 rounded-xl" />
                  </div>
                </div>
              ))}
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
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-bold text-white">{proj.title.en}</h3>
                        <span className="text-neutral-500 text-sm font-mono">/</span>
                        <h4 className="text-lg font-medium text-neutral-300" dir="rtl">
                          {proj.title.fa}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Header Status Badge */}
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold">
                          <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Deployed</span>
                        </span>

                        {/* Crisp External Links */}
                        {proj.github && (
                          <a
                            href={proj.github}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors border border-neutral-800"
                            title="View GitHub repository"
                          >
                            <Github className="w-4 h-4" />
                          </a>
                        )}
                        <a
                          href={`/${locale}/projects/${proj.slug.current}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 rounded-xl transition-colors border border-neutral-800"
                          title="Open live project on portfolio"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
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

                  {/* Actions Bar: Deduplicated, Clear Visual Hierarchy */}
                  <div className="flex items-center gap-2 flex-wrap sm:shrink-0 justify-end pt-4 lg:pt-0 border-t lg:border-t-0 border-neutral-800/80">
                    {/* Primary Action: Standalone High-Contrast Button */}
                    {proj.github && (
                      <button
                        type="button"
                        onClick={() => handleOpenEnvModal(proj.github)}
                        className="h-9 px-3.5 inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.98]"
                        title="Deploy or redeploy to Vercel"
                      >
                        <Server className="w-3.5 h-3.5 shrink-0" />
                        <span className="leading-none">Deploy to Vercel</span>
                      </button>
                    )}

                    {/* Secondary 1: Live Site */}
                    <a
                      href={`/${locale}/projects/${proj.slug.current}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-9 px-3.5 inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-500/30 transition-all shadow-sm group"
                      title="Open live project page on site"
                    >
                      <span className="leading-none">Live Site</span>
                      <ExternalLink className="w-3 h-3 shrink-0 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>

                    {/* Secondary 2: Edit Details */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(proj, "content")}
                      className="h-9 px-3.5 inline-flex items-center justify-center gap-2 text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-700/80 text-xs font-semibold transition-colors shadow-sm"
                      title="Edit project content, gallery & details"
                    >
                      <Edit3 className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                      <span className="leading-none">Edit Details</span>
                    </button>

                    {/* Secondary 3: To Draft */}
                    <button
                      type="button"
                      onClick={() => handleUnpublish(proj._id)}
                      className="h-9 px-3 inline-flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 transition-colors shadow-sm"
                      title="Convert project back to draft"
                    >
                      <Undo2 className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span className="leading-none">To Draft</span>
                    </button>

                    {/* Utility: Delete */}
                    <button
                      type="button"
                      onClick={() => handleDelete(proj._id, proj.title.en)}
                      className="h-9 w-9 inline-flex items-center justify-center text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-neutral-800 hover:border-red-500/20 transition-colors shadow-sm"
                      title="Delete project"
                      aria-label="Delete project"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingEdit) {
              setEditingProject(null);
              setEditForm(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
        >
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Sticky Header */}
            <div className="px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/95 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 id="edit-dialog-title" className="text-lg font-bold text-white tracking-tight">
                      Edit Project Content
                    </h2>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        editingProject.isDraft
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      }`}
                    >
                      {editingProject.isDraft ? "Draft" : "Live"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-mono truncate mt-0.5">
                    Slug: <span className="text-neutral-200">{editForm.slug.current || "not set"}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingProject(null);
                  setEditForm(null);
                }}
                className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors focus:ring-2 focus:ring-neutral-700 focus:outline-none shrink-0"
                title="Close (Esc)"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-nav Tabs */}
            <div className="px-6 pt-3 pb-2 border-b border-neutral-800/60 bg-neutral-950/40 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditModalTab("general")}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  editModalTab === "general"
                    ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40"
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
                <span>General &amp; Metadata</span>
              </button>

              <button
                type="button"
                onClick={() => setEditModalTab("content")}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  editModalTab === "content"
                    ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Bilingual Content (EN / FA)</span>
                <span className="text-[10px] bg-neutral-700/80 text-neutral-300 px-1.5 py-0.5 rounded font-mono">
                  4 Sections
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEditModalTab("media")}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  editModalTab === "media"
                    ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>Gallery &amp; Video</span>
                <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800/60 px-1.5 py-0.5 rounded font-mono">
                  {editForm.gallery?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEditModalTab("audit")}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  editModalTab === "audit"
                    ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>AI Audit &amp; README</span>
                {(() => {
                  const key = editForm.github?.toLowerCase().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "") || "";
                  const item = key ? repoAudits[key] : undefined;
                  if (item?.audit) {
                    return (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                        {item.audit.overallScore}/100
                      </span>
                    );
                  }
                  return null;
                })()}
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
              {editModalTab === "general" && (
                <div className="space-y-6 animate-in fade-in-50 duration-150">
                  {/* Titles */}
                  <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                      <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Project Titles</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="edit-title-en" className="text-xs font-medium text-neutral-300">
                            English Title
                          </label>
                          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700/60">
                            EN
                          </span>
                        </div>
                        <input
                          id="edit-title-en"
                          type="text"
                          value={editForm.title.en}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              title: { ...editForm.title, en: e.target.value },
                            })
                          }
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div dir="rtl">
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="edit-title-fa" className="text-xs font-medium text-neutral-300">
                            عنوان فارسی
                          </label>
                          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700/60">
                            FA
                          </span>
                        </div>
                        <input
                          id="edit-title-fa"
                          type="text"
                          value={editForm.title.fa}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              title: { ...editForm.title, fa: e.target.value },
                            })
                          }
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors text-right"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Slug & Links */}
                  <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                      <span>URL Links &amp; Identification</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="edit-slug" className="block text-xs font-medium text-neutral-300 mb-1.5">
                          Slug
                        </label>
                        <input
                          id="edit-slug"
                          type="text"
                          value={editForm.slug.current}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              slug: { current: e.target.value },
                            })
                          }
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-mono text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="edit-github" className="text-xs font-medium text-neutral-300">
                            GitHub Repository URL
                          </label>
                          {editForm.github && (
                            <a
                              href={editForm.github}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        <input
                          id="edit-github"
                          type="text"
                          value={editForm.github}
                          onChange={(e) => setEditForm({ ...editForm, github: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="edit-demo" className="text-xs font-medium text-neutral-300">
                            Live Demo URL
                          </label>
                          {editForm.demo && (
                            <a
                              href={editForm.demo}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        <input
                          id="edit-demo"
                          type="text"
                          placeholder="https://..."
                          value={editForm.demo || ""}
                          onChange={(e) => setEditForm({ ...editForm, demo: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Technologies */}
                  <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                        <Code className="w-3.5 h-3.5 text-blue-400" />
                        <span>Technologies &amp; Tools</span>
                      </h3>
                      <span className="text-xs text-neutral-400 font-mono">
                        {editForm.technologies.length} assigned
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 min-h-[2.5rem] p-3 bg-neutral-950 border border-neutral-800/80 rounded-xl">
                      {editForm.technologies.length === 0 ? (
                        <span className="text-xs text-neutral-500 italic">No technologies added yet.</span>
                      ) : (
                        editForm.technologies.map((tech, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800/90 text-neutral-200 border border-neutral-700/80 rounded-lg text-xs font-mono group"
                          >
                            <span>{tech}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditForm({
                                  ...editForm,
                                  technologies: editForm.technologies.filter((_, i) => i !== idx),
                                });
                              }}
                              className="text-neutral-400 hover:text-red-400 transition-colors font-bold px-0.5"
                              title={`Remove ${tech}`}
                              aria-label={`Remove ${tech}`}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        id="edit-new-tech"
                        type="text"
                        placeholder="Add technology (e.g. React, Tailwind CSS, TypeScript)..."
                        value={newTechTag}
                        onChange={(e) => setNewTechTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const val = newTechTag.trim().replace(/^,|,$/g, "");
                            if (val && !editForm.technologies.includes(val)) {
                              setEditForm({
                                ...editForm,
                                technologies: [...editForm.technologies, val],
                              });
                              setNewTechTag("");
                            }
                          }
                        }}
                        className="flex-1 px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = newTechTag.trim().replace(/^,|,$/g, "");
                          if (val && !editForm.technologies.includes(val)) {
                            setEditForm({
                              ...editForm,
                              technologies: [...editForm.technologies, val],
                            });
                            setNewTechTag("");
                          }
                        }}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 transition-colors shrink-0"
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>

                  {/* Featured Toggle */}
                  <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Star className={`w-5 h-5 ${editForm.featured ? "text-amber-400 fill-amber-400" : "text-neutral-500"}`} />
                      <div>
                        <label htmlFor="edit-featured" className="text-sm font-semibold text-white cursor-pointer">
                          Feature on Homepage
                        </label>
                        <p className="text-xs text-neutral-400">
                          Highlights this project in the featured section of your portfolio.
                        </p>
                      </div>
                    </div>
                    <input
                      id="edit-featured"
                      type="checkbox"
                      checked={Boolean(editForm.featured)}
                      onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })}
                      className="w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-neutral-900 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {editModalTab === "content" && (
                <div className="space-y-6 animate-in fade-in-50 duration-150">
                  {/* Descriptions Card */}
                  <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>Short Summary Description</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="edit-desc-en" className="text-xs font-medium text-neutral-300">
                            English Description
                          </label>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {editForm.description.en.length} chars
                          </span>
                        </div>
                        <textarea
                          id="edit-desc-en"
                          rows={3}
                          value={editForm.description.en}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              description: { ...editForm.description, en: e.target.value },
                            })
                          }
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors leading-relaxed"
                        />
                      </div>

                      <div dir="rtl">
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="edit-desc-fa" className="text-xs font-medium text-neutral-300">
                            توضیحات فارسی
                          </label>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {editForm.description.fa.length} کاراکتر
                          </span>
                        </div>
                        <textarea
                          id="edit-desc-fa"
                          rows={3}
                          value={editForm.description.fa}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              description: { ...editForm.description, fa: e.target.value },
                            })
                          }
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors text-right leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Overview Card */}
                  <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        <span>Project Overview</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="edit-overview-en" className="text-xs font-medium text-neutral-300">
                            Overview (EN)
                          </label>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {editForm.content.overview.en.length} chars
                          </span>
                        </div>
                        <textarea
                          id="edit-overview-en"
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
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors leading-relaxed"
                        />
                      </div>

                      <div dir="rtl">
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="edit-overview-fa" className="text-xs font-medium text-neutral-300">
                            بررسی اجمالی (FA)
                          </label>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {editForm.content.overview.fa.length} کاراکتر
                          </span>
                        </div>
                        <textarea
                          id="edit-overview-fa"
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
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors text-right leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Challenges Card */}
                  <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Challenges &amp; Solutions</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="edit-challenges-en" className="text-xs font-medium text-neutral-300">
                            Challenges (EN)
                          </label>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {editForm.content.challenges.en.length} chars
                          </span>
                        </div>
                        <textarea
                          id="edit-challenges-en"
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
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors leading-relaxed"
                        />
                      </div>

                      <div dir="rtl">
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="edit-challenges-fa" className="text-xs font-medium text-neutral-300">
                            چالش‌ها (FA)
                          </label>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {editForm.content.challenges.fa.length} کاراکتر
                          </span>
                        </div>
                        <textarea
                          id="edit-challenges-fa"
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
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors text-right leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Outcome Card */}
                  <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Outcome &amp; Deliverables</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="edit-outcome-en" className="text-xs font-medium text-neutral-300">
                            Outcome (EN)
                          </label>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {editForm.content.outcome.en.length} chars
                          </span>
                        </div>
                        <textarea
                          id="edit-outcome-en"
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
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors leading-relaxed"
                        />
                      </div>

                      <div dir="rtl">
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="edit-outcome-fa" className="text-xs font-medium text-neutral-300">
                            دستاوردها (FA)
                          </label>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {editForm.content.outcome.fa.length} کاراکتر
                          </span>
                        </div>
                        <textarea
                          id="edit-outcome-fa"
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
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors text-right leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editModalTab === "media" && (() => {
                const repoOgUrl = getGitHubOpenGraphUrl(editForm.github);
                const currentCoverUrl = editForm.coverImage?.asset?.url;
                const isOgActiveCover =
                  Boolean(repoOgUrl) &&
                  (currentCoverUrl === repoOgUrl ||
                    (!currentCoverUrl && !editForm.coverImage));
                const isGifActiveCover =
                  Boolean(editForm.previewGif?.asset?.url) &&
                  currentCoverUrl === editForm.previewGif?.asset?.url;

                return (
                  <div className="space-y-6 animate-in fade-in-50 duration-150">
                    {/* Top Bar: Sync from GitHub Actions & Quick Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-neutral-950/40 border border-neutral-800/80 rounded-xl">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                          <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                          <span>Project Media, Gallery &amp; Video Showcase</span>
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Manage GitHub dynamic social cards, screenshots, animated GIFs, cover image, and interactive video embeds.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {editForm.github && (
                          <button
                            type="button"
                            onClick={() => handleSyncProjectAssets(editingProject._id, editForm.github)}
                            disabled={isSyncingAssets}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition-colors disabled:opacity-50"
                            title="Pull screenshots & GIF generated by GitHub Actions asset capture"
                          >
                            {isSyncingAssets ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                            ) : (
                              <Camera className="w-3.5 h-3.5 text-purple-400" />
                            )}
                            <span>Sync from GitHub assets/</span>
                          </button>
                        )}

                        {editForm.github && (
                          <button
                            type="button"
                            onClick={() => handleOpenEnvModal(editForm.github)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-xs font-medium rounded-lg border border-amber-800/50 transition-colors"
                            title="Deploy or redeploy to Vercel"
                          >
                            <Server className="w-3.5 h-3.5 text-amber-400" />
                            <span>Deploy Vercel</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Section 1: Active Primary Cover Image Showcase */}
                    <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                          <Star className="w-3.5 h-3.5 text-amber-400" />
                          <span>Active Cover Image</span>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {isOgActiveCover
                            ? "Active Cover (Default GitHub OpenGraph)"
                            : currentCoverUrl
                            ? "Active Custom Cover"
                            : "Defaulting to OpenGraph"}
                        </span>
                      </div>

                      {/* Display whichever is active cover: explicit coverImage OR default to repoOgUrl */}
                      {(currentCoverUrl || repoOgUrl) ? (
                        <div className="flex flex-col sm:flex-row items-start gap-4 p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl">
                          <div className="relative w-full sm:w-56 h-32 bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 shrink-0">
                            <img
                              src={currentCoverUrl || repoOgUrl!}
                              alt={editForm.coverImage?.alt || `${editForm.title.en} Cover`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 bg-amber-500 text-neutral-950 text-[10px] font-bold px-2 py-0.5 rounded shadow">
                              ★ Active Cover
                            </div>
                          </div>
                          <div className="space-y-2 flex-1 min-w-0">
                            <div>
                              <label className="text-xs text-neutral-400 block mb-1">Cover Alt / Accessibility Label</label>
                              <input
                                type="text"
                                value={editForm.coverImage?.alt || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    coverImage: {
                                      _type: "image",
                                      ...editForm.coverImage,
                                      alt: e.target.value,
                                      asset: {
                                        ...editForm.coverImage?.asset,
                                        url: (currentCoverUrl || repoOgUrl) ?? undefined,
                                      },
                                    },
                                  })
                                }
                                placeholder="Describe project cover image..."
                                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                            <p className="text-[11px] text-neutral-400">
                              This image represents the project in portfolio cards, Twitter/social embeds, and search results. Click &quot;Set as Cover&quot; on any asset below to switch.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-neutral-900/40 border border-dashed border-neutral-800 rounded-xl text-center text-xs text-neutral-400">
                          No cover image set. Defaulting to GitHub OpenGraph dynamic social card.
                        </div>
                      )}
                    </div>

                    {/* Section 2: GitHub OpenGraph Dynamic Social Image */}
                    {repoOgUrl && (
                      <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Github className="w-3.5 h-3.5 text-neutral-300" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                              GitHub OpenGraph Social Card
                            </span>
                            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-mono">
                              Auto-Generated
                            </span>
                          </div>

                          {isOgActiveCover ? (
                            <span className="text-xs text-amber-400 font-semibold inline-flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>Active Cover</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetOpenGraphCover(repoOgUrl)}
                              className="text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 font-medium px-3 py-1.5 rounded-lg border border-neutral-700 transition-colors inline-flex items-center gap-1.5"
                            >
                              <Star className="w-3.5 h-3.5 text-amber-400" />
                              <span>Set as Cover</span>
                            </button>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-start gap-4 p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl">
                          <div className="relative w-full sm:w-64 aspect-[1200/630] bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 shrink-0">
                            <img
                              src={repoOgUrl}
                              alt="GitHub OpenGraph Social Card"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            {isOgActiveCover && (
                              <span className="absolute top-2 left-2 text-[10px] font-bold bg-amber-500 text-neutral-950 px-2 py-0.5 rounded shadow">
                                ★ Active Cover
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-white">Dynamic Repository Social Card</h4>
                            <p className="text-xs text-neutral-400 font-mono break-all line-clamp-1">
                              {repoOgUrl}
                            </p>
                            <p className="text-[11px] text-neutral-500">
                              GitHub automatically renders this rich preview card with the repository title, star count, fork count, language color tag, and account avatar. Used automatically as default project cover!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section 3: Modern Drag-and-Drop Gallery Upload & Thumbnails */}
                    <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-purple-400" />
                          <span>Project Gallery &amp; Screenshots ({editForm.gallery?.length || 0})</span>
                        </span>
                        {uploadProgress && (
                          <span className="text-xs text-purple-400 font-mono animate-pulse">
                            Uploading {uploadProgress.current} of {uploadProgress.total}...
                          </span>
                        )}
                      </div>

                      {/* Interactive Drag-and-Drop Dropzone */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingOver(true);
                        }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingOver(false);
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleUploadMultipleFiles(e.dataTransfer.files);
                          }
                        }}
                        className={`p-6 rounded-2xl border-2 border-dashed transition-all duration-200 text-center flex flex-col items-center justify-center gap-3 ${
                          isDraggingOver
                            ? "border-purple-500 bg-purple-500/15 scale-[1.01] ring-4 ring-purple-500/20"
                            : "border-neutral-700/80 bg-neutral-900/40 hover:border-neutral-600"
                        }`}
                      >
                        <div className="p-3 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-2xl">
                          <UploadCloud className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white mb-0.5">
                            {isDraggingOver ? "Drop image files to upload!" : "Drag & Drop Screenshots or Assets Here"}
                          </p>
                          <p className="text-xs text-neutral-400">
                            Supports single or multiple PNG, JPG, WebP images with auto-preview
                          </p>
                        </div>

                        <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
                          <input
                            type="text"
                            value={newImageCaption}
                            onChange={(e) => setNewImageCaption(e.target.value)}
                            placeholder="Optional caption (e.g. Dashboard View)..."
                            className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 w-56 text-center"
                          />

                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
                            {isUploadingAsset ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            <span>{isUploadingAsset ? "Uploading..." : "Browse Files"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              disabled={isUploadingAsset}
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handleUploadMultipleFiles(e.target.files);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Gallery Thumbnails Grid */}
                      {editForm.gallery && editForm.gallery.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {editForm.gallery.map((item, idx) => {
                            const isCurrentCover =
                              currentCoverUrl &&
                              item.asset?.url &&
                              currentCoverUrl === item.asset.url;

                            return (
                              <div
                                key={item._key || idx}
                                className={`bg-neutral-900/90 border rounded-xl overflow-hidden flex flex-col transition-all duration-200 group ${
                                  isCurrentCover
                                    ? "border-amber-500/60 ring-2 ring-amber-500/20 shadow-md"
                                    : "border-neutral-800/80 hover:border-neutral-700"
                                }`}
                              >
                                <div className="relative aspect-video bg-neutral-950 overflow-hidden">
                                  {item.asset?.url ? (
                                    <img
                                      src={item.asset.url}
                                      alt={item.caption || `Gallery ${idx + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
                                      No preview available
                                    </div>
                                  )}
                                  {isCurrentCover && (
                                    <span className="absolute top-2 left-2 text-[10px] font-bold bg-amber-500 text-neutral-950 px-2.5 py-0.5 rounded shadow">
                                      ★ Active Cover
                                    </span>
                                  )}
                                </div>

                                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                                  <input
                                    type="text"
                                    value={item.caption || ""}
                                    onChange={(e) => {
                                      const updated = (editForm.gallery || []).map((g, i) =>
                                        i === idx ? { ...g, caption: e.target.value } : g
                                      );
                                      setEditForm({ ...editForm, gallery: updated });
                                    }}
                                    placeholder="Caption..."
                                    className="w-full px-2 py-1 bg-neutral-950 border border-neutral-800/80 rounded text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  />

                                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/60">
                                    {!isCurrentCover ? (
                                      <button
                                        type="button"
                                        onClick={() => handleSetAsCover(item)}
                                        className="text-[11px] text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 transition-colors"
                                      >
                                        <Star className="w-3 h-3" />
                                        <span>Set as Cover</span>
                                      </button>
                                    ) : (
                                      <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        <span>Active Cover</span>
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveGalleryItem(item._key)}
                                      className="text-[11px] text-neutral-500 hover:text-red-400 inline-flex items-center gap-1 transition-colors"
                                      title="Remove from gallery"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Remove</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 bg-neutral-900/30 border border-neutral-800/80 rounded-xl text-center text-xs text-neutral-500">
                          No screenshots in gallery yet. Drag and drop images above or click &quot;Sync from GitHub assets/&quot;.
                        </div>
                      )}
                    </div>

                    {/* Section 4: Interactive Animated GIF (preview.gif) Controls */}
                    {editForm.previewGif?.asset?.url && (
                      <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Camera className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                              Animated Preview GIF (preview.gif)
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {isGifActiveCover ? (
                              <span className="text-xs text-amber-400 font-semibold inline-flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>Active Cover</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetPreviewGifCover(editForm.previewGif!.asset!.url!)}
                                className="text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 font-medium px-3 py-1 rounded-lg border border-neutral-700 transition-colors inline-flex items-center gap-1.5"
                              >
                                <Star className="w-3.5 h-3.5 text-amber-400" />
                                <span>Set as Cover</span>
                              </button>
                            )}

                            {/* Public display toggle */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editForm.previewGif.enabled !== false}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    previewGif: {
                                      ...editForm.previewGif,
                                      enabled: e.target.checked,
                                    },
                                  })
                                }
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                              <span className="ml-2 text-xs font-medium text-neutral-300">
                                {editForm.previewGif.enabled !== false ? "Display on Portfolio" : "Hidden"}
                              </span>
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start gap-4 p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl">
                          <div className="relative w-full sm:w-64 aspect-video bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 shrink-0">
                            <img
                              src={editForm.previewGif.asset.url}
                              alt="Animated Preview GIF"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            {isGifActiveCover && (
                              <span className="absolute top-2 left-2 text-[10px] font-bold bg-amber-500 text-neutral-950 px-2 py-0.5 rounded shadow">
                                ★ Active Cover
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-white">CI Automated GIF Recording</h4>
                            <p className="text-[11px] text-neutral-400">
                              Automated Playwright session capture generated by GitHub Actions asset pipeline. Can be toggled on/off for public visitor viewing or selected as the primary animated cover!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section 5: Collapsible Project Video Showcase */}
                    <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl overflow-hidden transition-all duration-200">
                      <div
                        onClick={() => setVideoCollapsibleOpen(!videoCollapsibleOpen)}
                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-neutral-900/40 transition-colors select-none"
                      >
                        <div className="flex items-center gap-2">
                          <Video className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                            Project Video Showcase
                          </span>
                          <span className="text-[10px] text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700/60 font-mono">
                            {editForm.video?.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label
                            className="relative inline-flex items-center cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(editForm.video?.enabled)}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  video: {
                                    enabled: e.target.checked,
                                    url: editForm.video?.url,
                                    asset: editForm.video?.asset,
                                  },
                                })
                              }
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ml-2 text-xs font-medium text-neutral-300">
                              {editForm.video?.enabled ? "Active" : "Inactive"}
                            </span>
                          </label>

                          <button
                            type="button"
                            className="p-1 text-neutral-400 hover:text-white"
                          >
                            {videoCollapsibleOpen ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {videoCollapsibleOpen && (
                        <div className="p-5 pt-0 space-y-4 border-t border-neutral-800/60">
                          {editForm.video?.enabled ? (
                            <div className="space-y-3.5 p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl animate-in fade-in-50 duration-150 mt-4">
                              <div>
                                <label className="block text-xs font-medium text-neutral-300 mb-1">
                                  Video URL (YouTube, Vimeo, Loom, or direct MP4 link)
                                </label>
                                <input
                                  type="url"
                                  value={editForm.video.url || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      video: {
                                        ...editForm.video!,
                                        url: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="https://www.youtube.com/watch?v=... or https://loom.com/share/..."
                                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>

                              {/* File Upload for Direct Video */}
                              <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                                  Or Upload Direct Video File (.mp4, .webm)
                                </label>
                                <div className="flex items-center gap-3">
                                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition-colors">
                                    <Play className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Upload Video File</span>
                                    <input
                                      type="file"
                                      accept="video/*"
                                      className="hidden"
                                      disabled={isUploadingAsset}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadProjectAsset(file, true);
                                      }}
                                    />
                                  </label>
                                  {editForm.video.asset?.url && (
                                    <span className="text-xs text-emerald-400 font-mono truncate">
                                      Direct file attached
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-500 mt-4">
                              Video showcase is currently inactive. Toggle the switch above to activate video embeds on the live portfolio project page.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {editModalTab === "audit" && (() => {
                const projectRepoKey = editForm.github
                  ? editForm.github.toLowerCase().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "")
                  : "";
                const projectRepoFullName = editForm.github
                  ? editForm.github.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "")
                  : projectRepoKey;
                const auditItem = projectRepoKey ? repoAudits[projectRepoKey] : undefined;

                if (!auditItem?.audit) {
                  return (
                    <div className="p-8 text-center bg-neutral-950/40 border border-neutral-800/80 rounded-2xl text-neutral-400 space-y-4">
                      <ShieldCheck className="w-12 h-12 mx-auto text-neutral-600" />
                      <div>
                        <h4 className="text-base font-semibold text-white mb-1">No AI Audit Yet</h4>
                        <p className="text-xs text-neutral-400 max-w-md mx-auto">
                          Run Gemini AI audit to evaluate repo code structure, dependencies, entry points,
                          and generate a ready-to-use bilingual README.
                        </p>
                      </div>
                      {projectRepoKey ? (
                        <button
                          type="button"
                          onClick={() => handleRunAudit(projectRepoFullName || projectRepoKey)}
                          disabled={auditingRepo === projectRepoKey || auditingRepo === projectRepoFullName}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors disabled:opacity-50"
                        >
                          {auditingRepo === projectRepoKey || auditingRepo === projectRepoFullName ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Running Audit...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>Run AI Audit for {projectRepoFullName || projectRepoKey}</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <p className="text-xs text-amber-400">
                          Add a valid GitHub URL in General &amp; Metadata to enable AI audit.
                        </p>
                      )}
                    </div>
                  );
                }

                const audit = auditItem.audit;

                return (
                  <div className="space-y-6 animate-in fade-in-50 duration-150">
                    {/* Score & Meta Bar */}
                    <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`text-2xl font-bold font-mono px-3 py-1.5 rounded-xl border ${
                            audit.overallScore >= 80
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : audit.overallScore >= 60
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-red-500/10 text-red-400 border-red-500/30"
                          }`}
                        >
                          {audit.overallScore}/100
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>Repository Health Score</span>
                            <span className="text-xs font-normal text-neutral-400">
                              (Status: <strong className="text-neutral-200 capitalize">{audit.documentationStatus}</strong>)
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400">
                            Evaluated via Google Gemini analyzing structure, dependencies, and docs.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {auditItem.readmeDraft && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const repoKey = projectRepoFullName || projectRepoKey;
                                if (repoKey) handleOpenPushModal(repoKey, auditItem.readmeDraft!);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Approve &amp; Push</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyReadme(auditItem.readmeDraft!)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition-colors"
                            >
                              {copiedReadme ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                              <span>{copiedReadme ? "Copied!" : "Copy README"}</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setViewingAudit({
                              repoName: projectRepoFullName || projectRepoKey || editForm.title.en,
                              audit,
                              readmeDraft: auditItem.readmeDraft,
                              context: auditItem.context,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-medium rounded-lg border border-blue-500/30 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Fullscreen Inspector</span>
                        </button>
                      </div>
                    </div>

                    {/* Executive Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-4">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                          Executive Summary (EN)
                        </span>
                        <p className="text-sm text-neutral-300 leading-relaxed">{audit.summary.en}</p>
                      </div>
                      <div dir="rtl" className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-4">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                          خلاصه تحلیل هوش مصنوعی (FA)
                        </span>
                        <p className="text-sm text-neutral-300 leading-relaxed">{audit.summary.fa}</p>
                      </div>
                    </div>

                    {/* Strengths & Improvements */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <Check className="w-4 h-4" />
                          <span>Project Strengths</span>
                        </h4>
                        <ul className="space-y-1.5 text-xs text-neutral-300">
                          {audit.strengths.en.map((s, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-400 font-bold">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" />
                          <span>Improvement Suggestions</span>
                        </h4>
                        <ul className="space-y-1.5 text-xs text-neutral-300">
                          {audit.improvements.en.map((s, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-400 font-bold">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* README Draft Preview */}
                    {auditItem.readmeDraft && (
                      <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                            <span>Generated Bilingual README.md Draft</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleCopyReadme(auditItem.readmeDraft!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition-colors"
                          >
                            {copiedReadme ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-neutral-400" />
                            )}
                            <span>{copiedReadme ? "Copied" : "Copy Markdown"}</span>
                          </button>
                        </div>
                        <div className="bg-neutral-950 rounded-xl border border-neutral-800/80 p-4 font-mono text-xs text-neutral-300 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                          {auditItem.readmeDraft}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-4 border-t border-neutral-800/80 bg-neutral-900/95 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0">
              <span className="text-xs text-neutral-500 hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded font-mono text-[10px] text-neutral-300">Esc</kbd> to discard changes
              </span>

              <div className="flex items-center gap-3 ml-auto">
                {editForm.github && (
                  <button
                    type="button"
                    onClick={() => handleOpenEnvModal(editForm.github)}
                    className="h-9 px-4 inline-flex items-center justify-center gap-2 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-xs font-semibold rounded-xl border border-amber-800/50 transition-colors shadow-sm"
                    title="Deploy or redeploy project to Vercel"
                  >
                    <Server className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span className="leading-none">Deploy Vercel</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEditingProject(null);
                    setEditForm(null);
                  }}
                  className="h-9 px-4 inline-flex items-center justify-center text-xs font-medium text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors focus:ring-2 focus:ring-neutral-700 focus:outline-none"
                >
                  <span className="leading-none">Cancel</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="h-9 px-5 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 active:scale-[0.98] focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                      <span className="leading-none">Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="leading-none">Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN AUDIT & README INSPECTOR MODAL */}
      {viewingAudit && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in-50 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingAudit(null);
          }}
        >
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 id="audit-dialog-title" className="text-lg font-bold text-white tracking-tight truncate">
                      {viewingAudit.repoName}
                    </h2>
                    <span
                      className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${
                        viewingAudit.audit.overallScore >= 80
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : viewingAudit.audit.overallScore >= 60
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                      }`}
                    >
                      Score: {viewingAudit.audit.overallScore}/100
                    </span>
                    <span className="text-[11px] text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700/60 font-medium capitalize">
                      README: {viewingAudit.audit.documentationStatus}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    Google Gemini Architecture &amp; Documentation Audit
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingAudit(null)}
                className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors focus:ring-2 focus:ring-neutral-700 focus:outline-none shrink-0"
                title="Close (Esc)"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-nav Tabs */}
            <div className="px-6 pt-3 pb-2 border-b border-neutral-800/60 bg-neutral-950/40 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuditDialogTab("audit")}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    auditDialogTab === "audit"
                      ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Audit Insights &amp; Structure</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuditDialogTab("readme")}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    auditDialogTab === "readme"
                      ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bilingual README.md Draft</span>
                  {viewingAudit.readmeDraft && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              </div>

              {viewingAudit.readmeDraft && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenPushModal(viewingAudit.repoName, viewingAudit.readmeDraft!)}
                    className="h-8.5 px-3.5 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors shrink-0"
                    title="Commit directly to GitHub or create a Pull Request"
                  >
                    <UploadCloud className="w-3.5 h-3.5 shrink-0" />
                    <span className="leading-none">Approve &amp; Push</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyReadme(viewingAudit.readmeDraft!)}
                    className="h-8.5 px-3.5 inline-flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-700 transition-colors shadow-sm shrink-0"
                  >
                    {copiedReadme ? (
                      <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                    )}
                    <span className="leading-none">{copiedReadme ? "Copied!" : "Copy README"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
              {auditDialogTab === "audit" && (
                <div className="space-y-6 animate-in fade-in-50 duration-150">
                  {/* Executive Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-5 space-y-2">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                        Executive Summary (English)
                      </span>
                      <p className="text-sm text-neutral-200 leading-relaxed">
                        {viewingAudit.audit.summary.en}
                      </p>
                    </div>

                    <div dir="rtl" className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-5 space-y-2">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                        خلاصه تحلیل هوش مصنوعی (فارسی)
                      </span>
                      <p className="text-sm text-neutral-200 leading-relaxed">
                        {viewingAudit.audit.summary.fa}
                      </p>
                    </div>
                  </div>

                  {/* Strengths & Improvements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          <span>Key Strengths</span>
                        </h3>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                          {viewingAudit.audit.strengths.en.length} highlights
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <span className="text-[11px] font-semibold text-neutral-400 block mb-1">English</span>
                          <ul className="space-y-1.5 text-xs text-neutral-300">
                            {viewingAudit.audit.strengths.en.map((s, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-emerald-400 font-bold">•</span>
                                <span className="leading-relaxed">{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {viewingAudit.audit.strengths.fa?.length > 0 && (
                          <div dir="rtl" className="pt-2 border-t border-emerald-500/10">
                            <span className="text-[11px] font-semibold text-neutral-400 block mb-1">فارسی</span>
                            <ul className="space-y-1.5 text-xs text-neutral-300">
                              {viewingAudit.audit.strengths.fa.map((s, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-emerald-400 font-bold">•</span>
                                  <span className="leading-relaxed">{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Improvements */}
                    <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>Recommended Improvements</span>
                        </h3>
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                          {viewingAudit.audit.improvements.en.length} suggestions
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <span className="text-[11px] font-semibold text-neutral-400 block mb-1">English</span>
                          <ul className="space-y-1.5 text-xs text-neutral-300">
                            {viewingAudit.audit.improvements.en.map((s, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-amber-400 font-bold">•</span>
                                <span className="leading-relaxed">{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {viewingAudit.audit.improvements.fa?.length > 0 && (
                          <div dir="rtl" className="pt-2 border-t border-amber-500/10">
                            <span className="text-[11px] font-semibold text-neutral-400 block mb-1">فارسی</span>
                            <ul className="space-y-1.5 text-xs text-neutral-300">
                              {viewingAudit.audit.improvements.fa.map((s, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-amber-400 font-bold">•</span>
                                  <span className="leading-relaxed">{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tech Stack Highlights */}
                  {viewingAudit.audit.techStackHighlights?.length > 0 && (
                    <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-5 space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                        <Code className="w-3.5 h-3.5 text-blue-400" />
                        <span>Tech Stack &amp; Architectural Elements</span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {viewingAudit.audit.techStackHighlights.map((tech, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-neutral-800/90 text-neutral-200 px-3 py-1 rounded-lg border border-neutral-700/80 font-mono shadow-sm"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inspected Repo Context */}
                  {viewingAudit.context && (
                    <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                        <FileCode className="w-3.5 h-3.5 text-blue-400" />
                        <span>Repository Inspection Snapshot</span>
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800/60">
                          <span className="text-neutral-500 block">Default Branch</span>
                          <span className="text-neutral-200 font-mono font-semibold">
                            {viewingAudit.context.defaultBranch || "main"}
                          </span>
                        </div>
                        <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800/60">
                          <span className="text-neutral-500 block">Files Inspected</span>
                          <span className="text-neutral-200 font-mono font-semibold">
                            {viewingAudit.context.totalFiles} files
                          </span>
                        </div>
                        <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800/60">
                          <span className="text-neutral-500 block">README on Repo</span>
                          <span
                            className={`font-semibold ${
                              viewingAudit.context.hasReadme ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {viewingAudit.context.hasReadme ? "Present" : "Missing / Empty"}
                          </span>
                        </div>
                        <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800/60">
                          <span className="text-neutral-500 block">package.json</span>
                          <span
                            className={`font-semibold ${
                              viewingAudit.context.hasPackageJson ? "text-emerald-400" : "text-neutral-400"
                            }`}
                          >
                            {viewingAudit.context.hasPackageJson ? "Detected" : "None"}
                          </span>
                        </div>
                      </div>

                      {/* Entry point */}
                      {viewingAudit.context.entryPoint && (
                        <div>
                          <span className="text-xs text-neutral-400 font-medium block mb-1.5">
                            Main Entry Point:
                          </span>
                          <span className="text-xs font-mono bg-neutral-900 text-neutral-200 px-2.5 py-1 rounded border border-neutral-800 inline-block">
                            {viewingAudit.context.entryPoint}
                          </span>
                        </div>
                      )}

                      {/* Config files */}
                      {viewingAudit.context.configFiles && viewingAudit.context.configFiles.length > 0 && (
                        <div>
                          <span className="text-xs text-neutral-400 font-medium block mb-1.5">
                            Configuration Files:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {viewingAudit.context.configFiles.map((cfg: string, i: number) => (
                              <span
                                key={i}
                                className="text-xs font-mono bg-neutral-900 text-neutral-300 px-2 py-0.5 rounded border border-neutral-800"
                              >
                                {cfg}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Environment Variables & Deployment Guard */}
                      <div className="pt-3 border-t border-neutral-800/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-amber-400" />
                            <span>Environment Variable Requirements</span>
                          </span>
                          {viewingAudit.audit.requiresEnv ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Requires Config ({viewingAudit.audit.envVariables?.length || 0})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Zero Env Required
                            </span>
                          )}
                        </div>

                        {viewingAudit.audit.requiresEnv && (
                          <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3.5 space-y-3">
                            <p className="text-xs text-amber-200/90 leading-relaxed">
                              This repository references external credentials or runtime keys in its codebase. You can configure and deploy them directly to Vercel:
                            </p>
                            <div className="space-y-1.5">
                              {(viewingAudit.audit.envVariables || []).map((env, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-900/80 border border-neutral-800/80 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono text-white font-semibold truncate">{env.key}</span>
                                    {env.isSecret && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                                        secret
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-neutral-400 text-[11px] truncate">{env.description}</span>
                                </div>
                              ))}
                            </div>
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleOpenEnvModal(viewingAudit.repoName, viewingAudit.audit.envVariables)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg shadow-sm transition-colors"
                              >
                                <Key className="w-3.5 h-3.5" />
                                <span>Configure &amp; Deploy to Vercel</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Visual Asset Capture CI Action */}
                      <div className="pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-semibold text-white block">
                            Visual Preview Assets &amp; Animated GIF (CI)
                          </span>
                          <span className="text-xs text-neutral-400">
                            Deploy a headless Playwright runner to this repository and capture screenshots &amp; demo.gif remotely.
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {viewingAudit.audit.requiresEnv && (
                            <button
                              type="button"
                              onClick={() => handleOpenEnvModal(viewingAudit.repoName, viewingAudit.audit.envVariables)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors shrink-0"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>Deploy Vercel First</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeployAssetRunner(viewingAudit.repoName)}
                            disabled={deployingAssetRunner === viewingAudit.repoName}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors shrink-0 disabled:opacity-50"
                          >
                            {deployingAssetRunner === viewingAudit.repoName ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Camera className="w-3.5 h-3.5" />
                            )}
                            <span>Deploy &amp; Run CI Capture</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {auditDialogTab === "readme" && (
                <div className="space-y-4 animate-in fade-in-50 duration-150">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <BookOpen className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-neutral-300 space-y-1">
                        <p className="font-semibold text-white">
                          Ready-to-Commit Bilingual README Draft (English &amp; Persian)
                        </p>
                        <p className="text-neutral-400">
                          This README draft was crafted by Google Gemini using the repository&apos;s inspected
                          package.json, entry points, and directory tree. You can push it directly or open an automated PR.
                        </p>
                      </div>
                    </div>
                    {viewingAudit.readmeDraft && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenPushModal(viewingAudit.repoName, viewingAudit.readmeDraft!)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Approve &amp; Push</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyReadme(viewingAudit.readmeDraft!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-lg border border-neutral-700 transition-colors shadow-sm"
                        >
                          {copiedReadme ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-neutral-400" />
                          )}
                          <span>{copiedReadme ? "Copied!" : "Copy"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {viewingAudit.readmeDraft ? (
                    <div className="relative">
                      <pre className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 text-xs text-neutral-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[50vh] select-all">
                        {viewingAudit.readmeDraft}
                      </pre>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-neutral-500 bg-neutral-950/40 rounded-xl border border-neutral-800">
                      <BookOpen className="w-10 h-10 mx-auto mb-2 text-neutral-600" />
                      <p>No README draft was generated for this repository.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0">
              <span className="text-xs text-neutral-500 hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded font-mono text-[10px] text-neutral-300">Esc</kbd> to close
              </span>

              <div className="flex items-center gap-3 ml-auto">
                {viewingAudit.repoName.includes("/") && (
                  <a
                    href={`https://github.com/${viewingAudit.repoName}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-4 inline-flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 transition-colors shadow-sm"
                  >
                    <Github className="w-3.5 h-3.5 shrink-0" />
                    <span className="leading-none">View on GitHub</span>
                    <ExternalLink className="w-3 h-3 shrink-0 text-neutral-400" />
                  </a>
                )}

                {viewingAudit.readmeDraft && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCopyReadme(viewingAudit.readmeDraft!)}
                      className="h-9 px-4 inline-flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors shadow-sm"
                    >
                      {copiedReadme ? (
                        <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                      )}
                      <span className="leading-none">{copiedReadme ? "Copied" : "Copy Markdown"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenPushModal(viewingAudit.repoName, viewingAudit.readmeDraft!)}
                      className="h-9 px-4 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
                    >
                      <UploadCloud className="w-3.5 h-3.5 shrink-0" />
                      <span className="leading-none">Approve &amp; Push to GitHub</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setViewingAudit(null)}
                  className="h-9 px-4 inline-flex items-center justify-center text-xs font-medium text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
                >
                  <span className="leading-none">Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVERSE SYNC / PUSH README MODAL */}
      {pushingReadmeConfig && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in-50 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="push-readme-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPushingReadme) {
              setPushingReadmeConfig(null);
              setPushSuccessResult(null);
            }
          }}
        >
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/95 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl shrink-0">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 id="push-readme-title" className="text-lg font-bold text-white tracking-tight">
                    Approve &amp; Push to GitHub
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono truncate">
                    Repository: <span className="text-neutral-200 font-semibold">{pushingReadmeConfig.fullName}</span>
                  </p>
                </div>
              </div>

              {!isPushingReadme && (
                <button
                  type="button"
                  onClick={() => {
                    setPushingReadmeConfig(null);
                    setPushSuccessResult(null);
                  }}
                  className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {pushSuccessResult ? (
                <div className="p-6 text-center space-y-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl animate-in zoom-in-95 duration-150">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">
                      {pushSuccessResult.mode === "pr" ? "Pull Request Opened Successfully!" : "Direct Commit Successful!"}
                    </h4>
                    <p className="text-xs text-neutral-300 max-w-md mx-auto leading-relaxed">
                      {pushSuccessResult.message}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    {pushSuccessResult.pullRequestUrl && (
                      <a
                        href={pushSuccessResult.pullRequestUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-colors"
                      >
                        <GitPullRequest className="w-4 h-4" />
                        <span>View PR #{pushSuccessResult.pullRequestNumber} on GitHub</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {pushSuccessResult.commitUrl && (
                      <a
                        href={pushSuccessResult.commitUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors"
                      >
                        <GitCommit className="w-4 h-4 text-blue-400" />
                        <span>View Commit on GitHub</span>
                        <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Step 1: Choose Push Mode */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      1. Select Commit Destination
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Direct Commit Option */}
                      <button
                        type="button"
                        disabled={isPushingReadme}
                        onClick={() => setPushingReadmeConfig({ ...pushingReadmeConfig, mode: "direct" })}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          pushingReadmeConfig.mode === "direct"
                            ? "bg-blue-950/40 border-blue-500/80 ring-2 ring-blue-500/20"
                            : "bg-neutral-950/40 border-neutral-800 hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <GitCommit className={`w-4 h-4 ${pushingReadmeConfig.mode === "direct" ? "text-blue-400" : "text-neutral-500"}`} />
                          <span className="text-sm font-bold text-white">Direct Commit</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-auto">
                            Immediate
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Commits directly to the default branch (<code className="text-neutral-300 font-mono">{pushingReadmeConfig.targetBranch || "main"}</code>). Updates documentation instantly.
                        </p>
                      </button>

                      {/* PR Option */}
                      <button
                        type="button"
                        disabled={isPushingReadme}
                        onClick={() => setPushingReadmeConfig({ ...pushingReadmeConfig, mode: "pr" })}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          pushingReadmeConfig.mode === "pr"
                            ? "bg-emerald-950/40 border-emerald-500/80 ring-2 ring-emerald-500/20"
                            : "bg-neutral-950/40 border-neutral-800 hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <GitPullRequest className={`w-4 h-4 ${pushingReadmeConfig.mode === "pr" ? "text-emerald-400" : "text-neutral-500"}`} />
                          <span className="text-sm font-bold text-white">Pull Request</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-auto">
                            Recommended
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Creates a dedicated branch and opens an automated PR. Best for peer reviews and CI checks.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Branch & Commit Configurations */}
                  <div className="bg-neutral-950/50 border border-neutral-800/80 rounded-xl p-4 space-y-4">
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      2. Branch &amp; Commit Details
                    </label>

                    {pushingReadmeConfig.mode === "direct" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Target Branch</label>
                          <input
                            type="text"
                            disabled={isPushingReadme}
                            value={pushingReadmeConfig.targetBranch}
                            onChange={(e) => setPushingReadmeConfig({ ...pushingReadmeConfig, targetBranch: e.target.value })}
                            placeholder="main"
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Commit Message</label>
                          <input
                            type="text"
                            disabled={isPushingReadme}
                            value={pushingReadmeConfig.commitMessage}
                            onChange={(e) => setPushingReadmeConfig({ ...pushingReadmeConfig, commitMessage: e.target.value })}
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">New Branch Name</label>
                            <input
                              type="text"
                              disabled={isPushingReadme}
                              value={pushingReadmeConfig.branchName}
                              onChange={(e) => setPushingReadmeConfig({ ...pushingReadmeConfig, branchName: e.target.value })}
                              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">Base Branch</label>
                            <input
                              type="text"
                              disabled={isPushingReadme}
                              value={pushingReadmeConfig.targetBranch}
                              onChange={(e) => setPushingReadmeConfig({ ...pushingReadmeConfig, targetBranch: e.target.value })}
                              placeholder="main"
                              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Pull Request Title</label>
                          <input
                            type="text"
                            disabled={isPushingReadme}
                            value={pushingReadmeConfig.prTitle}
                            onChange={(e) => setPushingReadmeConfig({ ...pushingReadmeConfig, prTitle: e.target.value })}
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">PR Description / Body</label>
                          <textarea
                            rows={2}
                            disabled={isPushingReadme}
                            value={pushingReadmeConfig.prBody}
                            onChange={(e) => setPushingReadmeConfig({ ...pushingReadmeConfig, prBody: e.target.value })}
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 3: Review / Edit Markdown */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                        3. Approved README.md Markdown Content
                      </label>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {pushingReadmeConfig.content.length} characters
                      </span>
                    </div>
                    <textarea
                      rows={8}
                      disabled={isPushingReadme}
                      value={pushingReadmeConfig.content}
                      onChange={(e) => setPushingReadmeConfig({ ...pushingReadmeConfig, content: e.target.value })}
                      className="w-full p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-xs text-neutral-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 select-all"
                      placeholder="# Repository Title..."
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/95 flex items-center justify-between gap-4">
              <span className="text-xs text-neutral-500 hidden sm:inline">
                {pushSuccessResult ? "Synced to GitHub" : "Review carefully before submitting"}
              </span>

              <div className="flex items-center gap-3 ml-auto">
                {pushSuccessResult ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPushingReadmeConfig(null);
                      setPushSuccessResult(null);
                    }}
                    className="h-9 px-5 inline-flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
                  >
                    <span className="leading-none">Done</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isPushingReadme}
                      onClick={() => setPushingReadmeConfig(null)}
                      className="h-9 px-4 inline-flex items-center justify-center text-xs font-medium text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                      <span className="leading-none">Cancel</span>
                    </button>

                    <button
                      type="button"
                      disabled={isPushingReadme || !pushingReadmeConfig.content.trim()}
                      onClick={handleExecutePushReadme}
                      className={`h-9 px-5 inline-flex items-center justify-center gap-2 font-bold text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 ${
                        pushingReadmeConfig.mode === "pr"
                          ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                          : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
                      }`}
                    >
                      {isPushingReadme ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                          <span className="leading-none">Pushing to GitHub...</span>
                        </>
                      ) : pushingReadmeConfig.mode === "pr" ? (
                        <>
                          <GitPullRequest className="w-3.5 h-3.5 shrink-0" />
                          <span className="leading-none">Create Pull Request</span>
                        </>
                      ) : (
                        <>
                          <GitCommit className="w-3.5 h-3.5 shrink-0" />
                          <span className="leading-none">Commit to {pushingReadmeConfig.targetBranch || "main"}</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VERCEL ENVIRONMENT VARIABLE & DEPLOYMENT MODAL */}
      {envModalConfig && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in-50 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="env-config-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeployingVercel) {
              setEnvModalConfig(null);
              setVercelDeployResult(null);
            }
          }}
        >
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/95 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 id="env-config-title" className="text-lg font-bold text-white tracking-tight">
                    Environment Variables &amp; Vercel Deployment
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono truncate">
                    Repository: <span className="text-neutral-200 font-semibold">{envModalConfig.repoFullName}</span>
                  </p>
                </div>
              </div>

              {!isDeployingVercel && (
                <button
                  type="button"
                  onClick={() => {
                    setEnvModalConfig(null);
                    setVercelDeployResult(null);
                  }}
                  className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {vercelDeployResult ? (
                <div className="p-6 text-center space-y-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl animate-in zoom-in-95 duration-150">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">
                      Deployed to Vercel Successfully!
                    </h4>
                    <p className="text-xs text-neutral-300 max-w-md mx-auto leading-relaxed">
                      {vercelDeployResult.message || "Project is live and visual asset capture runner has been dispatched."}
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs flex items-center justify-center gap-2">
                    <span className="text-neutral-400 font-mono">Live Demo:</span>
                    <a
                      href={vercelDeployResult.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-emerald-400 hover:text-emerald-300 underline font-semibold inline-flex items-center gap-1"
                    >
                      <span>{vercelDeployResult.liveUrl}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="text-xs text-neutral-400 max-w-md mx-auto bg-neutral-900/60 border border-neutral-800 p-3 rounded-lg text-left space-y-1">
                    <span className="font-semibold text-neutral-200 block">Automated Capture Pipeline:</span>
                    <p className="text-[11px] leading-relaxed">
                      Playwright is capturing screenshots &amp; animated GIFs directly from this live URL on GitHub Actions, bypassing local dev server startup entirely.
                    </p>
                  </div>
                </div>
              ) : isDeployingVercel ? (
                <div className="p-8 text-center space-y-4 bg-amber-950/10 border border-amber-500/20 rounded-2xl animate-in zoom-in-95 duration-150">
                  <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg">
                    <RefreshCw className="w-7 h-7 animate-spin" />
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white mb-1">
                      Deploying Pipeline in Progress
                    </h4>
                    <p className="text-xs text-amber-300 font-mono">
                      {vercelDeployStatus || "Communicating with Vercel API..."}
                    </p>
                  </div>

                  <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                    Please do not close this window. We are linking the project, encrypting environment keys, awaiting a successful build, and dispatching the capture runner.
                  </p>
                </div>
              ) : (
                <>
                  {/* Pipeline Guard Notice */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-neutral-300 space-y-1">
                      <p className="font-semibold text-white">
                        Live Deployment &amp; Remote Capture Pipeline
                      </p>
                      <p className="text-neutral-400 leading-relaxed">
                        To accurately capture this application without build failures, enter the required environment variables below. We will push encrypted variables to Vercel, deploy production, and feed the live URL directly to Playwright.
                      </p>
                    </div>
                  </div>

                  {/* Branch Config */}
                  <div className="bg-neutral-950/50 border border-neutral-800/80 rounded-xl p-3.5 space-y-2">
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Git Source Branch
                    </label>
                    <input
                      type="text"
                      value={envModalConfig.branch || "main"}
                      onChange={(e) => setEnvModalConfig({ ...envModalConfig, branch: e.target.value })}
                      placeholder="main"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Environment Variables Form */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                        Environment Variables ({envModalConfig.envVariables.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddCustom(true)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1"
                      >
                        <span>+ Add Custom Variable</span>
                      </button>
                    </div>

                    {showAddCustom && (
                      <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center gap-2">
                        <input
                          type="text"
                          value={newEnvKey}
                          onChange={(e) => setNewEnvKey(e.target.value.toUpperCase())}
                          placeholder="VARIABLE_NAME (e.g. API_SECRET)"
                          className="flex-1 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = newEnvKey.trim();
                            if (trimmed) {
                              if (!envModalConfig.envVariables.some((v) => v.key === trimmed)) {
                                setEnvModalConfig({
                                  ...envModalConfig,
                                  envVariables: [
                                    ...envModalConfig.envVariables,
                                    {
                                      key: trimmed,
                                      required: true,
                                      description: "User-defined environment variable.",
                                      isSecret: /key|secret|token|pass|auth|pwd|cred/i.test(trimmed),
                                    },
                                  ],
                                });
                              }
                              setNewEnvKey("");
                              setShowAddCustom(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs rounded-lg transition-colors"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewEnvKey("");
                            setShowAddCustom(false);
                          }}
                          className="px-2 py-1.5 text-neutral-400 hover:text-white text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {envModalConfig.envVariables.length === 0 ? (
                      <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl text-center text-xs text-neutral-400">
                        No variables detected. Click &quot;+ Add Custom Variable&quot; or proceed with standard Vercel defaults.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {envModalConfig.envVariables.map((v) => (
                          <div
                            key={v.key}
                            className="p-3.5 bg-neutral-950/70 border border-neutral-800/80 rounded-xl space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-mono font-bold text-white truncate">
                                  {v.key}
                                </span>
                                {v.required && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950/60 text-red-400 border border-red-800/50">
                                    Required
                                  </span>
                                )}
                                {v.isSecret && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                                    Secret
                                  </span>
                                )}
                              </div>
                            </div>

                            {v.description && (
                              <p className="text-[11px] text-neutral-400">
                                {v.description}
                              </p>
                            )}

                            <div className="relative">
                              <input
                                type={v.isSecret && !revealedSecrets[v.key] ? "password" : "text"}
                                value={envFormValues[v.key] || ""}
                                onChange={(e) =>
                                  setEnvFormValues({
                                    ...envFormValues,
                                    [v.key]: e.target.value,
                                  })
                                }
                                placeholder={`Enter value for ${v.key}...`}
                                className="w-full px-3 py-2 pr-10 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                              {v.isSecret && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedSecrets({
                                      ...revealedSecrets,
                                      [v.key]: !revealedSecrets[v.key],
                                    })
                                  }
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                                  title={revealedSecrets[v.key] ? "Hide secret" : "Reveal secret"}
                                >
                                  {revealedSecrets[v.key] ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/95 flex items-center justify-between gap-4">
              <span className="text-xs text-neutral-500 hidden sm:inline font-mono">
                {vercelDeployResult
                  ? "Live site ready"
                  : "Encrypted across Production & Preview targets"}
              </span>

              <div className="flex items-center gap-3 ml-auto">
                {vercelDeployResult ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEnvModalConfig(null);
                      setVercelDeployResult(null);
                    }}
                    className="h-9 px-5 inline-flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
                  >
                    <span className="leading-none">Done</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isDeployingVercel}
                      onClick={() => setEnvModalConfig(null)}
                      className="h-9 px-4 inline-flex items-center justify-center text-xs font-medium text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                      <span className="leading-none">Cancel</span>
                    </button>

                    <button
                      type="button"
                      disabled={isDeployingVercel}
                      onClick={handleExecuteVercelDeploy}
                      className="h-9 px-5 inline-flex items-center justify-center gap-2 font-bold text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20 disabled:opacity-50"
                    >
                      {isDeployingVercel ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                          <span className="leading-none">Deploying to Vercel...</span>
                        </>
                      ) : (
                        <>
                          <Server className="w-3.5 h-3.5 shrink-0" />
                          <span className="leading-none">Deploy to Vercel &amp; Capture Live</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
