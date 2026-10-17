"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Save,
  CheckCircle2,
  Trash2,
  Star,
  ExternalLink,
  Plus,
  X,
  Upload,
  RefreshCw,
  Globe,
  Layers,
  FileCode,
  Image as ImageIcon,
  Check,
  ArrowLeft,
  Sparkles,
  Lock,
  AlertCircle,
  RotateCcw,
  Cpu,
  Radar,
  Camera,
  DownloadCloud,
  Film,
} from "lucide-react";
import { FaGithub as Github } from "react-icons/fa";
import { Breadcrumbs } from "./breadcrumbs";
import { ProjectThumbnail } from "./project-thumbnail";
import { BilingualFieldRow } from "./bilingual-field-row";
import { LanguageBar } from "@/components/ui/language-bar";
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import { ProjectAuditBadge } from "@/components/projects/project-audit-badge";
import type { SanityProject, GalleryItem } from "./types";
import type { ScanStreamEvent } from "@/types/api";
import { DeveloperTelemetryToggle } from "./developer-telemetry-toggle";

interface ProjectFullPageEditorProps {
  initialProject: SanityProject;
  locale: string;
  isPrivateRepo?: boolean;
}

export function ProjectFullPageEditor({
  initialProject,
  locale,
  isPrivateRepo = false,
}: ProjectFullPageEditorProps) {
  const router = useRouter();
  const [project, setProject] = useState<SanityProject>(initialProject);
  const [activeTab, setActiveTab] = useState<"general" | "content" | "media">("general");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSettingCover, setIsSettingCover] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanStreamEvent | null>(null);
  const [refiningFieldName, setRefiningFieldName] = useState<string | null>(null);
  const [polishingState, setPolishingState] = useState<{
    fieldName: string;
    sourceLanguage: "en" | "fa";
  } | null>(null);
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [lastUndoState, setLastUndoState] = useState<{
    fieldKey: string;
    label: string;
    prevProject: SanityProject;
  } | null>(null);
  const [newTech, setNewTech] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Media Gallery Sovereign Assets State
  type ProjectMediaData = {
    githubOg: {
      exists: boolean;
      url: string | null;
      lowResUrl: string | null;
    };
    captures: Array<{
      name: string;
      url: string;
      lowResUrl?: string | null;
      type: "SCREENSHOT" | "GIF";
    }>;
  };

  const [mediaData, setMediaData] = useState<ProjectMediaData | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isFetchingOg, setIsFetchingOg] = useState(false);
  const [isTriggeringCapture, setIsTriggeringCapture] = useState(false);
  const [isSyncingCaptures, setIsSyncingCaptures] = useState(false);

  // Extract GitHub repo fullName (owner/repo) if project has a github URL
  const githubRepoFullName = React.useMemo(() => {
    if (!project.github) return null;
    const cleaned = project.github.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
    const parts = cleaned.split("/").filter(Boolean);
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }, [project.github]);

  const loadMediaData = useCallback(async () => {
    try {
      setIsLoadingMedia(true);
      const res = await fetch(`/api/admin/projects/${encodeURIComponent(project._id)}/media`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMediaData({
            githubOg: data.githubOg,
            captures: data.captures || [],
          });
        }
      }
    } catch (err) {
      console.warn("[MediaGallery] Error loading media data:", err);
    } finally {
      setIsLoadingMedia(false);
    }
  }, [project._id]);

  useEffect(() => {
    if (activeTab === "media") {
      loadMediaData();
    }
  }, [activeTab, loadMediaData]);

  // Check if an asset is the currently selected cover
  const isCurrentCover = useCallback(
    (assetUrl?: string | null, assetId?: string | null) => {
      if (!assetUrl && !assetId) return false;
      const currentUrl = project.coverImage?.asset?.url || project.image?.asset?.url || "";
      const currentId = project.coverImage?.asset?._id || project.coverImage?.asset?._ref || "";

      if (assetUrl && currentUrl && assetUrl === currentUrl) return true;
      if (assetId && currentId && assetId === currentId) return true;
      if (assetUrl && currentUrl) {
        const cleanA = assetUrl.split("?")[0];
        const cleanC = currentUrl.split("?")[0];
        if (cleanA === cleanC) return true;
        if (cleanA.replace(/-low\.webp$/, "-high.webp") === cleanC.replace(/-low\.webp$/, "-high.webp")) return true;
      }
      return false;
    },
    [project.coverImage, project.image]
  );

  // Fetch or Re-fetch GitHub OpenGraph social card
  const handleFetchOg = async () => {
    setIsFetchingOg(true);
    try {
      const res = await fetch(`/api/admin/projects/${encodeURIComponent(project._id)}/fetch-og`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch GitHub OpenGraph image.");

      showToast("GitHub OpenGraph social card successfully fetched and processed!", "success");
      await loadMediaData();
      router.refresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error fetching GitHub OG.", "error");
    } finally {
      setIsFetchingOg(false);
    }
  };

  // Trigger automated visual capture on GitHub Actions
  const handleTriggerCapture = async () => {
    setIsTriggeringCapture(true);
    try {
      const res = await fetch(`/api/admin/projects/${encodeURIComponent(project._id)}/capture`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to trigger visual capture action.");

      showToast(data.message || "Automated Playwright capture action dispatched on GitHub!", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error triggering capture.", "error");
    } finally {
      setIsTriggeringCapture(false);
    }
  };

  // Sync captures from repo assets/ folder into Supabase Storage
  const handleSyncCaptures = async () => {
    if (!githubRepoFullName) {
      showToast("A valid GitHub repository URL is required to sync captures.", "error");
      return;
    }
    setIsSyncingCaptures(true);
    try {
      const res = await fetch("/api/admin/projects/sync-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: githubRepoFullName,
          projectId: project._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to sync visual captures.");

      showToast(data.message || "Visual assets successfully synced into Supabase Storage!", "success");
      await loadMediaData();
      router.refresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error syncing captures.", "error");
    } finally {
      setIsSyncingCaptures(false);
    }
  };

  const githubOgUrl = githubRepoFullName
    ? `https://opengraph.githubassets.com/1/${githubRepoFullName}`
    : null;

  const isOgCover = Boolean(
    project.coverImage?.asset?.url?.includes("/projects/github-og/") ||
    (githubRepoFullName &&
      (project.coverImage?.asset?.url?.includes("opengraph.githubassets.com") ||
        project.coverImage?.alt?.toLowerCase().includes("open graph") ||
        (project.coverImage?.alt?.toLowerCase().includes("github") && project.coverImage?.alt?.toLowerCase().includes("card"))))
  );

  const hasGeneratedContent = Boolean(
    (project.description?.en && project.description.en.trim().length > 10) ||
    (project.content?.overview?.en && project.content.overview.en.trim().length > 10)
  );

  const hasAiDigest = Boolean(
    project.aiContextDigest?.rawDigest || project.aiContextDigest?.summary
  );

  // GRAND GENERATOR: Full repository scan & AI dossier creation via SSE stream
  const handleGenerateWithAI = async () => {
    if (!githubRepoFullName) {
      showToast("A valid GitHub repository URL is required to generate AI content.", "error");
      return;
    }
    setIsGeneratingAI(true);
    setScanProgress({
      stage: "AUDITING_REPO_TREE",
      message: "Starting high-signal heuristic analysis...",
      progressPercent: 10,
    });

    try {
      const res = await fetch(`/api/admin/projects/${encodeURIComponent(project._id)}/ai-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: githubRepoFullName }),
      });

      if (!res.ok) {
        throw new Error(`Failed to initiate scan: ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("Failed to initialize SSE stream reader.");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let finalData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            try {
              const event: ScanStreamEvent = JSON.parse(trimmed.slice(5).trim());
              setScanProgress(event);

              if (event.stage === "COMPLETE") {
                finalData = event.data;
              } else if (event.stage === "ERROR") {
                throw new Error(event.message || "Deep Scan failed.");
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
                console.warn("[SSE Parser] Failed to parse event:", parseErr);
              }
            }
          }
        }
      }

      if (finalData?.project) {
        const p = finalData.project;
        setProject((prev) => ({
          ...prev,
          _id: p._id || p.id || prev._id,
          title: p.title || prev.title,
          slug: p.slug || prev.slug,
          description: p.description || prev.description,
          technologies: p.technologies?.length ? p.technologies : prev.technologies,
          content: p.content || prev.content,
          featured: p.featured ?? prev.featured,
          demo: p.demo || p.liveUrl || prev.demo,
          gallery: p.gallery || prev.gallery,
          coverImage: p.coverImage || prev.coverImage,
          aiContextDigest: finalData.aiContextDigest || p.aiContextDigest || prev.aiContextDigest,
          languages: finalData.languages || p.languages || prev.languages,
          rawLanguages: finalData.rawLanguages || p.rawLanguages || prev.rawLanguages,
        }));
      }

      showToast(
        hasGeneratedContent
          ? "Grand AI analysis complete: Technical dossier & case study re-generated!"
          : "Grand AI analysis complete: Baseline draft & AI dossier generated!",
        "success"
      );
      router.refresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error generating draft.", "error");
    } finally {
      setIsGeneratingAI(false);
      setScanProgress(null);
    }
  };

  // 1. REFINE: Row-level regeneration of both EN & FA from the stored AI dossier
  const handleRefineBilingualRow = async (fieldName: string) => {
    if (!hasAiDigest) {
      showToast("Run Deep Scan first to enable AI actions.", "error");
      return;
    }

    setRefiningFieldName(fieldName);
    const prevProjectSnapshot: SanityProject = JSON.parse(JSON.stringify(project));

    try {
      const res = await fetch(`/api/admin/projects/${encodeURIComponent(project._id)}/ai-field`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refine",
          fieldName,
          clientDigest: project.aiContextDigest,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to refine bilingual fields.");
      }

      setProject((prev) => {
        const next: SanityProject = { ...prev };
        if (fieldName === "title") {
          next.title = { en: data.en, fa: data.fa };
        } else if (fieldName === "description") {
          next.description = { en: data.en, fa: data.fa };
        } else if (fieldName === "overview" || fieldName === "tagline") {
          next.content = {
            ...next.content,
            overview: { en: data.en, fa: data.fa },
          };
        } else if (fieldName === "challenges") {
          next.content = {
            ...next.content,
            challenges: { en: data.en, fa: data.fa },
          };
        } else if (fieldName === "outcome") {
          next.content = {
            ...next.content,
            outcome: { en: data.en, fa: data.fa },
          };
        }
        return next;
      });

      setLastUndoState({
        fieldKey: fieldName,
        label: fieldName.toUpperCase(),
        prevProject: prevProjectSnapshot,
      });

      setHighlightedField(fieldName);
      setTimeout(() => {
        setHighlightedField((curr) => (curr === fieldName ? null : curr));
      }, 3000);

      showToast(`Refined bilingual pair for ${fieldName} from AI dossier!`, "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error refining field.", "error");
    } finally {
      setRefiningFieldName(null);
    }
  };

  // 2. POLISH: Field-level smoothing and automatic sibling translation sync
  const handlePolishField = async (
    fieldName: string,
    sourceLanguage: "en" | "fa",
    currentText: string
  ) => {
    if (!hasAiDigest) {
      showToast("Run Deep Scan first to enable AI actions.", "error");
      return;
    }

    if (!currentText.trim()) {
      showToast("Cannot polish an empty field. Type some text or click Refine.", "error");
      return;
    }

    setPolishingState({ fieldName, sourceLanguage });
    const prevProjectSnapshot: SanityProject = JSON.parse(JSON.stringify(project));

    try {
      const res = await fetch(`/api/admin/projects/${encodeURIComponent(project._id)}/ai-field`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "polish",
          fieldName,
          sourceLanguage,
          currentText,
          clientDigest: project.aiContextDigest,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to polish field.");
      }

      setProject((prev) => {
        const next: SanityProject = { ...prev };
        if (fieldName === "title") {
          next.title = { en: data.en, fa: data.fa };
        } else if (fieldName === "description") {
          next.description = { en: data.en, fa: data.fa };
        } else if (fieldName === "overview" || fieldName === "tagline") {
          next.content = {
            ...next.content,
            overview: { en: data.en, fa: data.fa },
          };
        } else if (fieldName === "challenges") {
          next.content = {
            ...next.content,
            challenges: { en: data.en, fa: data.fa },
          };
        } else if (fieldName === "outcome") {
          next.content = {
            ...next.content,
            outcome: { en: data.en, fa: data.fa },
          };
        }
        return next;
      });

      setLastUndoState({
        fieldKey: fieldName,
        label: `${fieldName.toUpperCase()} (${sourceLanguage.toUpperCase()})`,
        prevProject: prevProjectSnapshot,
      });

      setHighlightedField(fieldName);
      setTimeout(() => {
        setHighlightedField((curr) => (curr === fieldName ? null : curr));
      }, 3000);

      showToast(
        `Polished ${sourceLanguage === "en" ? "English" : "Persian"} and synced translation!`,
        "success"
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error polishing field.", "error");
    } finally {
      setPolishingState(null);
    }
  };

  // MICRO-GENERATOR: Legacy / Tags regeneration using ONLY aiContextDigest
  const handleMicroRegenerate = async (fieldKey: string, fieldLabel: string) => {
    if (!hasAiDigest) {
      showToast("Run Deep Scan first to enable AI actions.", "error");
      return;
    }

    setRegeneratingField(fieldKey);
    const prevProjectSnapshot: SanityProject = JSON.parse(JSON.stringify(project));

    try {
      const res = await fetch(`/api/admin/projects/${encodeURIComponent(project._id)}/ai-field`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldKey,
          clientDigest: project.aiContextDigest,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to regenerate field.");
      }

      const val = data.value;

      setProject((prev) => {
        const next: SanityProject = { ...prev };
        if (fieldKey === "technologies" && Array.isArray(val)) {
          next.technologies = val;
        }
        return next;
      });

      setLastUndoState({
        fieldKey,
        label: fieldLabel,
        prevProject: prevProjectSnapshot,
      });

      setHighlightedField(fieldKey);
      setTimeout(() => {
        setHighlightedField((curr) => (curr === fieldKey ? null : curr));
      }, 3000);

      showToast(`Regenerated ${fieldLabel} with AI!`, "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error regenerating field.", "error");
    } finally {
      setRegeneratingField(null);
    }
  };

  const handleUndo = () => {
    if (lastUndoState) {
      setProject(lastUndoState.prevProject);
      showToast(`Reverted changes to ${lastUndoState.label}.`, "success");
      setLastUndoState(null);
    }
  };

  const FieldAiHeader = ({
    label,
    fieldKey,
  }: {
    label: string;
    fieldKey: string;
  }) => {
    const isThisRegenerating = regeneratingField === fieldKey;

    return (
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <span>{label}</span>
        </label>

        <button
          type="button"
          onClick={() => handleMicroRegenerate(fieldKey, label)}
          disabled={isThisRegenerating || !hasAiDigest}
          title={
            hasAiDigest
              ? `Regenerate ${label} using stored AI technical dossier`
              : "Run Full Repo Analysis first to enable field AI generation."
          }
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
            !hasAiDigest
              ? "opacity-40 cursor-not-allowed border-border text-muted-foreground bg-muted/30"
              : isThisRegenerating
              ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse"
              : "border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary dark:text-primary hover:border-primary/40 active:scale-95"
          }`}
        >
          {isThisRegenerating ? (
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          ) : (
            <Sparkles className="w-2.5 h-2.5 text-amber-400 dark:text-amber-300" />
          )}
          <span>{isThisRegenerating ? "Regenerating..." : "Regenerate with AI"}</span>
        </button>
      </div>
    );
  };

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const handleAddTech = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTech.trim();
    if (!clean || project.technologies?.includes(clean)) return;
    setProject({ ...project, technologies: [...(project.technologies || []), clean] });
    setNewTech("");
  };

  const handleRemoveTech = (tech: string) => {
    setProject({
      ...project,
      technologies: (project.technologies || []).filter((t) => t !== tech),
    });
  };

  // Save changes to database via PUT /api/admin/projects
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: project._id,
          data: project,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to save project.");

      showToast("All project changes saved to database!", "success");
      router.refresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error saving project.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Publish / Approve Project
  const handleTogglePublish = async () => {
    setIsPublishing(true);
    try {
      const isCurrentlyDraft = project.isDraft;
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isCurrentlyDraft ? "publish" : "toDraft",
          id: project._id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Action failed.");

      setProject({ ...project, isDraft: !isCurrentlyDraft });
      showToast(
        isCurrentlyDraft
          ? "Project approved and published live to portfolio!"
          : "Project converted back to draft status.",
        "success"
      );
      router.refresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error publishing project.", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  // Set Cover Image Mutation
  const handleSetCover = async (
    assetId: string,
    imageUrl?: string,
    altText?: string,
    lowResUrl?: string
  ) => {
    setIsSettingCover(assetId || imageUrl || "loading");
    try {
      const res = await fetch("/api/admin/projects/set-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project._id,
          imageAssetId: assetId,
          imageUrl,
          lowResUrl,
          alt: altText || project.title?.en || "Cover Image",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update cover image.");

      // Synchronize local state immediately
      const finalId = data.assetId || assetId;
      const finalUrl = data.coverImageUrl || imageUrl || project.coverImage?.asset?.url;
      setProject((prev) => ({
        ...prev,
        gallery: data.project?.gallery || prev.gallery,
        coverImage: {
          _type: "image",
          alt: altText || prev.title?.en || "Cover Image",
          asset: {
            _id: finalId,
            _ref: finalId,
            url: finalUrl,
          },
        },
        image: {
          _type: "image",
          alt: altText || prev.title?.en || "Cover Image",
          asset: {
            _id: finalId,
            _ref: finalId,
            url: finalUrl,
          },
        },
      }));

      await loadMediaData();
      showToast("Cover image successfully updated in database!", "success");
      router.refresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error setting cover image.", "error");
    } finally {
      setIsSettingCover(null);
    }
  };

  // Upload image to gallery
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", project._id);

      const res = await fetch("/api/admin/projects/upload-asset", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to upload image.");

      const newGalleryItem: GalleryItem = {
        _key: `img_${Date.now()}`,
        _type: "galleryImage",
        caption: file.name.replace(/\.[^/.]+$/, ""),
        alt: file.name,
        asset: {
          _id: data.assetId,
          _ref: data.assetId,
          url: data.url,
        },
      };

      const updatedGallery = [...(project.gallery || []), newGalleryItem];
      setProject({ ...project, gallery: updatedGallery });

      // Automatically patch database document
      await fetch("/api/admin/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: project._id,
          data: { gallery: updatedGallery },
        }),
      });

      showToast("New image uploaded and added to gallery!", "success");
      router.refresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error uploading image.", "error");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Remove image from gallery
  const handleRemoveGalleryImage = async (keyToRemove: string) => {
    const updatedGallery = (project.gallery || []).filter((g) => g._key !== keyToRemove);
    setProject({ ...project, gallery: updatedGallery });

    try {
      await fetch("/api/admin/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: project._id,
          data: { gallery: updatedGallery },
        }),
      });
      showToast("Image removed from gallery.", "success");
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 end-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-700/80 text-emerald-200"
              : toastMessage.type === "info"
              ? "bg-blue-950/90 border-blue-700/80 text-blue-200"
              : "bg-red-950/90 border-red-700/80 text-red-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : toastMessage.type === "info" ? (
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
          ) : (
            <X className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ms-2 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Breadcrumbs & Back Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <Breadcrumbs
          items={[
            { label: "Admin", href: `/${locale}/admin` },
            { label: "Projects", href: `/${locale}/admin?view=grid` },
            {
              label:
                (locale === "fa"
                  ? project.title?.fa?.trim() || project.title?.en?.trim()
                  : project.title?.en?.trim() || project.title?.fa?.trim()) ||
                (githubRepoFullName ? githubRepoFullName.split("/")[1] : null) ||
                project.slug?.current ||
                "Project Editor",
              current: true,
            },
          ]}
        />

        <div className="flex items-center gap-2.5">
          <DeveloperTelemetryToggle onToast={showToast} compact />
          <button
            type="button"
            onClick={() => router.push(`/${locale}/admin?view=grid`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>{locale === "fa" ? "بازگشت به پروژه‌ها" : "Back to Grid"}</span>
          </button>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              dir={locale === "fa" && project.title?.fa ? "rtl" : "ltr"}
              className="text-xl sm:text-2xl font-bold text-foreground font-sans text-left truncate"
              title={
                (locale === "fa"
                  ? project.title?.fa?.trim() || project.title?.en?.trim()
                  : project.title?.en?.trim() || project.title?.fa?.trim()) ||
                (githubRepoFullName ? githubRepoFullName.split("/")[1] : null) ||
                project.slug?.current ||
                "Project Editor"
              }
            >
              {(locale === "fa"
                ? project.title?.fa?.trim() || project.title?.en?.trim()
                : project.title?.en?.trim() || project.title?.fa?.trim()) ||
                (githubRepoFullName ? githubRepoFullName.split("/")[1] : null) ||
                project.slug?.current ||
                "Untitled Project"}
            </h1>

            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                project.isDraft
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
              }`}
            >
              {project.isDraft ? "Draft for Review" : "Published Live"}
            </span>

            <ProjectAuditBadge
              project={{
                id: project._id,
                slug: project.slug?.current,
                auditScore: project.auditScore,
                auditBreakdown: project.auditBreakdown,
                auditedAt: project.auditedAt,
              }}
              isAdmin={true}
              locale={locale}
              onAuditUpdated={(report) => {
                setProject((prev) => ({
                  ...prev,
                  auditScore: report.score,
                  auditBreakdown: report,
                  auditedAt: report.auditedAt,
                }));
                showToast(
                  locale === "fa"
                    ? `امتیاز ممیزی پروژه با موفقیت به ${report.score} به‌روزرسانی شد.`
                    : `Project audit score refreshed: ${report.score}/100.`,
                  "success"
                );
              }}
            />
          </div>

          <p dir="ltr" className="text-xs font-mono text-muted-foreground text-left">
            Slug: /{project.slug?.current}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {!project.isDraft && project.slug?.current && (
            <a
              href={`/${locale}/projects/${project.slug.current}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 transition-colors"
            >
              <span>View on Site</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground rtl:rotate-180" />
            </a>
          )}

          <button
            type="button"
            onClick={handleTogglePublish}
            disabled={isPublishing}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 ${
              project.isDraft
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            {isPublishing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : project.isDraft ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <FileCode className="w-3.5 h-3.5" />
            )}
            <span>{project.isDraft ? "Approve & Publish Live" : "Revert to Draft"}</span>
          </button>

          {githubRepoFullName && (
            <CustomTooltip
              content="Full repository codebase audit: extracts architecture dossier, populates project fields, and enables micro-generation."
              side="bottom"
            >
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGeneratingAI || isSaving}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                ) : (
                  <Radar className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>
                  {isGeneratingAI
                    ? "Scanning Codebase..."
                    : hasAiDigest
                    ? "Re-run Deep Scan"
                    : "Deep Scan"}
                </span>
              </button>
            </CustomTooltip>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Editor Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto no-scrollbar flex-nowrap">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 min-h-[44px] ${
            activeTab === "general"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>General Metadata &amp; URLs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 min-h-[44px] ${
            activeTab === "content"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Bilingual Content &amp; Case Study</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("media")}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 min-h-[44px] ${
            activeTab === "media"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Media</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-6">
        {/* Inline Undo / Feedback Banner */}
        {lastUndoState && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-primary/30 bg-primary/10 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Field <strong>{lastUndoState.label}</strong> was regenerated with AI. Review the new copy and save changes when ready.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors flex items-center gap-1 active:scale-95 shadow-xs"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
              <CustomTooltip content="Dismiss" side="top">
                <button
                  type="button"
                  onClick={() => setLastUndoState(null)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </CustomTooltip>
            </div>
          </div>
        )}

        {/* AI Technical Dossier Info Card */}
        <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                hasAiDigest ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">AI Technical Dossier (aiContextDigest)</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    hasAiDigest
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                  }`}
                >
                  {hasAiDigest ? "Active Dossier" : "Not Analyzed"}
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                {hasAiDigest
                  ? `Commit: ${project.aiContextDigest?.lastAnalyzedCommit || "latest"} • Analyzed: ${
                      project.aiContextDigest?.lastAnalyzedAt
                        ? new Date(project.aiContextDigest.lastAnalyzedAt).toLocaleDateString()
                        : "recent"
                    } • Powers zero-fetch, instant micro-regeneration.`
                  : "Run Grand AI Analysis to generate the internal technical dossier and unlock one-click field micro-regeneration."}
              </p>
            </div>
          </div>
          {!hasAiDigest && githubRepoFullName && (
            <CustomTooltip
              content="Full repository codebase audit: extracts architecture dossier, populates project fields, and enables micro-generation."
              side="top"
            >
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGeneratingAI}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-xs shrink-0 disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Radar className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{isGeneratingAI ? "Scanning Codebase..." : "Deep Scan"}</span>
              </button>
            </CustomTooltip>
          )}
        </div>

        {/* Live SSE Deep Scan Progress Indicator */}
        {scanProgress && (
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-primary flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                <span>{scanProgress.message}</span>
              </span>
              <span className="font-mono text-xs font-bold text-primary">{scanProgress.progressPercent}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${scanProgress.progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* GitHub Language Breakdown Bar in Repository Audit Header */}
        {(project.languages || project.rawLanguages) && (
          <div className="p-4 rounded-xl border border-border bg-card space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">Codebase Language Breakdown</span>
              {githubRepoFullName && (
                <span className="font-mono text-muted-foreground text-[11px]">{githubRepoFullName}</span>
              )}
            </div>
            <LanguageBar
              languages={project.languages}
              rawLanguages={project.rawLanguages}
              barHeight="md"
              showLegend={true}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 1: GENERAL METADATA */}
        {/* ================================================================= */}
        {activeTab === "general" && (
          <div className="space-y-5">
            {/* Project Title Bilingual Row */}
            <BilingualFieldRow
              fieldName="title"
              label="Project Title"
              multiline={false}
              required
              enValue={project.title?.en || ""}
              faValue={project.title?.fa || ""}
              onChangeEn={(val) =>
                setProject((prev) => ({
                  ...prev,
                  title: { ...prev.title, en: val },
                }))
              }
              onChangeFa={(val) =>
                setProject((prev) => ({
                  ...prev,
                  title: { ...prev.title, fa: val },
                }))
              }
              hasAiDigest={hasAiDigest}
              onRefine={handleRefineBilingualRow}
              onPolish={handlePolishField}
              isRefining={refiningFieldName === "title"}
              isPolishing={
                polishingState?.fieldName === "title"
                  ? polishingState.sourceLanguage
                  : null
              }
              isHighlighted={highlightedField === "title"}
              placeholderEn="e.g. NextGen Web Platform"
              placeholderFa="مثال: پلتفرم نسل بعدی وب"
              descriptionHint="Core project identifier displayed across the portfolio."
            />

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Slug (URL Identifier)
              </label>
              <input
                type="text"
                dir="ltr"
                value={project.slug?.current || ""}
                onChange={(e) =>
                  setProject({ ...project, slug: { current: e.target.value } })
                }
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-border bg-background text-foreground"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  GitHub Repository Link
                </label>
                <div className="relative">
                  <Github className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    dir="ltr"
                    value={project.github || ""}
                    onChange={(e) => setProject({ ...project, github: e.target.value })}
                    className="w-full ps-9 pe-3 py-2 text-xs font-mono rounded-xl border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Live Production Demo Link
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    dir="ltr"
                    value={project.demo || ""}
                    onChange={(e) => setProject({ ...project, demo: e.target.value })}
                    className="w-full ps-9 pe-3 py-2 text-xs font-mono rounded-xl border border-border bg-background text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Technologies */}
            <div className="space-y-2">
              <FieldAiHeader
                label="Technologies & Libraries (Strictly LTR)"
                fieldKey="technologies"
              />

              <div
                dir="ltr"
                className={`flex flex-wrap gap-1.5 text-left p-2.5 rounded-xl border transition-all ${
                  highlightedField === "technologies"
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5"
                    : regeneratingField === "technologies"
                    ? "border-amber-500/60 ring-2 ring-amber-500/20 animate-pulse bg-amber-500/5"
                    : "border-border/60 bg-muted/20"
                }`}
              >
                {project.technologies?.map((tech) => (
                  <span
                    key={tech}
                    dir="ltr"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-card text-foreground border border-border shadow-2xs"
                  >
                    <span>{tech}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTech(tech)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <form onSubmit={handleAddTech} className="flex items-center gap-2 max-w-md pt-1">
                <input
                  type="text"
                  dir="ltr"
                  placeholder="e.g. Next.js, TypeScript, Playwright..."
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-border bg-background text-foreground"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-border hover:bg-muted/50 transition-colors"
                >
                  Add Tag
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: CONTENT & CASE STUDY */}
        {/* ================================================================= */}
        {activeTab === "content" && (
          <div className="space-y-6">
            {/* Short Descriptions */}
            <BilingualFieldRow
              label="Project Description / Summary"
              fieldName="description"
              descriptionHint="High-level introductory summary for search cards and hero section."
              multiline={true}
              rows={3}
              enValue={project.description?.en || ""}
              faValue={project.description?.fa || ""}
              placeholderEn="High-level summary of the project architecture and features..."
              placeholderFa="خلاصه کوتاه و روان از معماری و ویژگی‌های کلیدی پروژه..."
              onChangeEn={(val) =>
                setProject({
                  ...project,
                  description: { ...project.description, en: val },
                })
              }
              onChangeFa={(val) =>
                setProject({
                  ...project,
                  description: { ...project.description, fa: val },
                })
              }
              hasAiDigest={hasAiDigest}
              onRefine={handleRefineBilingualRow}
              onPolish={handlePolishField}
              isRefining={refiningFieldName === "description"}
              isPolishing={
                polishingState?.fieldName === "description"
                  ? polishingState.sourceLanguage
                  : null
              }
              isHighlighted={highlightedField === "description"}
            />

            {/* Architecture Overview */}
            <BilingualFieldRow
              label="Architecture Overview"
              fieldName="overview"
              descriptionHint="In-depth breakdown of system design, architecture patterns, and state management."
              multiline={true}
              rows={6}
              enValue={project.content?.overview?.en || ""}
              faValue={project.content?.overview?.fa || ""}
              placeholderEn="Detailed architectural breakdown, core services, and data flows..."
              placeholderFa="بررسی جامع ساختار سیستم، الگوهای طراحی و جریان داده‌ها..."
              onChangeEn={(val) =>
                setProject({
                  ...project,
                  content: {
                    ...project.content,
                    overview: { ...project.content?.overview, en: val },
                  },
                })
              }
              onChangeFa={(val) =>
                setProject({
                  ...project,
                  content: {
                    ...project.content,
                    overview: { ...project.content?.overview, fa: val },
                  },
                })
              }
              hasAiDigest={hasAiDigest}
              onRefine={handleRefineBilingualRow}
              onPolish={handlePolishField}
              isRefining={refiningFieldName === "overview"}
              isPolishing={
                polishingState?.fieldName === "overview"
                  ? polishingState.sourceLanguage
                  : null
              }
              isHighlighted={highlightedField === "overview"}
            />

            {/* Technical Challenges */}
            <BilingualFieldRow
              label="Technical Challenges & Solutions"
              fieldName="challenges"
              descriptionHint="Key engineering hurdles, performance bottlenecks, and architectural solutions."
              multiline={true}
              rows={5}
              enValue={project.content?.challenges?.en || ""}
              faValue={project.content?.challenges?.fa || ""}
              placeholderEn="Key challenges faced and how they were solved..."
              placeholderFa="چالش‌های فنی، بهینه‌سازی‌ها و راهکارهای پیاده‌سازی شده..."
              onChangeEn={(val) =>
                setProject({
                  ...project,
                  content: {
                    ...project.content,
                    challenges: { ...project.content?.challenges, en: val },
                  },
                })
              }
              onChangeFa={(val) =>
                setProject({
                  ...project,
                  content: {
                    ...project.content,
                    challenges: { ...project.content?.challenges, fa: val },
                  },
                })
              }
              hasAiDigest={hasAiDigest}
              onRefine={handleRefineBilingualRow}
              onPolish={handlePolishField}
              isRefining={refiningFieldName === "challenges"}
              isPolishing={
                polishingState?.fieldName === "challenges"
                  ? polishingState.sourceLanguage
                  : null
              }
              isHighlighted={highlightedField === "challenges"}
            />

            {/* Project Outcome & Deliverables */}
            <BilingualFieldRow
              label="Project Outcome & Deliverables"
              fieldName="outcome"
              descriptionHint="Engineering deliverables, performance gains, and measurable results."
              multiline={true}
              rows={5}
              enValue={project.content?.outcome?.en || ""}
              faValue={project.content?.outcome?.fa || ""}
              placeholderEn="Measurable results, performance improvements, and key deliverables..."
              placeholderFa="دستاوردها، نتایج ملموس، بهبودهای عملکردی و تاثیرات نهایی پروژه..."
              onChangeEn={(val) =>
                setProject({
                  ...project,
                  content: {
                    ...project.content,
                    outcome: { ...project.content?.outcome, en: val },
                  },
                })
              }
              onChangeFa={(val) =>
                setProject({
                  ...project,
                  content: {
                    ...project.content,
                    outcome: { ...project.content?.outcome, fa: val },
                  },
                })
              }
              hasAiDigest={hasAiDigest}
              onRefine={handleRefineBilingualRow}
              onPolish={handlePolishField}
              isRefining={refiningFieldName === "outcome"}
              isPolishing={
                polishingState?.fieldName === "outcome"
                  ? polishingState.sourceLanguage
                  : null
              }
              isHighlighted={highlightedField === "outcome"}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: MEDIA, COVER IMAGE & GALLERY */}
        {/* ================================================================= */}
        {activeTab === "media" && (
          <div className="space-y-6">
            {/* Warning for private repositories */}
            {isPrivateRepo && (
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-foreground">
                    Private Repository Warning
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    This project is linked to a <strong>Private GitHub Repository</strong>. GitHub Open Graph social preview banners cannot be automatically generated for private repositories because they are blocked from public CDN distribution. Please upload custom screenshots or cover media assets directly.
                  </p>
                </div>
              </div>
            )}

            {/* Primary Cover Image Preview Card */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-foreground block">
                  Current Cover Image (Primary Master Reference)
                </label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Asset ID: {project.coverImage?.asset?._id || project.coverImage?.asset?._ref || "Inherited"}
                </span>
              </div>

              <div className="relative aspect-video rounded-2xl overflow-hidden border border-border bg-muted/40 max-w-xl">
                <ProjectThumbnail
                  sanityCoverUrl={
                    project.coverImage?.asset?.url || project.image?.asset?.url
                  }
                  sanityAssetId={
                    project.coverImage?.asset?._id ||
                    project.coverImage?.asset?._ref ||
                    project.image?.asset?._id ||
                    project.image?.asset?._ref
                  }
                  repoFullName={project.github}
                  alt={project.title?.en}
                  aspectRatio="aspect-video"
                  badge={
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white shadow-xs">
                      <Star className="w-3 h-3 fill-white" />
                      <span>Primary Cover</span>
                    </span>
                  }
                />
              </div>
            </div>

            {/* Media Assets Gallery Section */}
            <div className="space-y-4 pt-2 border-t border-border/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span>Project Media Gallery</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Unified media assets stored permanently in Supabase Storage. Set any asset as the active cover.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Action 1: Trigger GitHub Actions Capture */}
                  <CustomTooltip content="Dispatch automated Playwright screenshots & GIF workflow on GitHub" side="top">
                    <button
                      type="button"
                      onClick={handleTriggerCapture}
                      disabled={isTriggeringCapture || !githubRepoFullName}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isTriggeringCapture ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                      ) : (
                        <Camera className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span>{isTriggeringCapture ? "Dispatching..." : "Trigger Capture Action"}</span>
                    </button>
                  </CustomTooltip>

                  {/* Action 2: Sync Repo Captures */}
                  <CustomTooltip content="Download generated screenshots/GIFs from repo assets/ folder into Supabase Storage" side="top">
                    <button
                      type="button"
                      onClick={handleSyncCaptures}
                      disabled={isSyncingCaptures || !githubRepoFullName}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isSyncingCaptures ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                      ) : (
                        <DownloadCloud className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>{isSyncingCaptures ? "Syncing..." : "Sync Repo Captures"}</span>
                    </button>
                  </CustomTooltip>

                  {/* Action 3: Upload Custom Media */}
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 transition-colors cursor-pointer shadow-xs">
                    {isUploading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{isUploading ? "Uploading..." : "Upload Media Asset"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImage}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>

              {/* Unified Media Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. GitHub OpenGraph Asset Card */}
                {(() => {
                  const ogUrl =
                    mediaData?.githubOg?.url ||
                    (project.coverImage?.asset?.url?.includes("/projects/github-og/")
                      ? project.coverImage.asset.url
                      : null);
                  const ogLowRes = mediaData?.githubOg?.lowResUrl || null;
                  const hasOgAsset = Boolean(mediaData?.githubOg?.exists || ogUrl);
                  const isCurrent = isCurrentCover(ogUrl);

                  if (hasOgAsset && ogUrl) {
                    return (
                      <div
                        key="github-og-card"
                        className={`flex flex-col justify-between rounded-xl overflow-hidden border p-3 transition-all ${
                          isCurrent
                            ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30"
                            : "border-border bg-background hover:border-border/80"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/40">
                            <ProjectThumbnail
                              sanityCoverUrl={ogUrl || undefined}
                              repoFullName={githubRepoFullName || undefined}
                              alt="GitHub Open Graph Social Card"
                              aspectRatio="aspect-video"
                              badge={
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900/90 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs">
                                    <Github className="w-2.5 h-2.5" />
                                    <span>GitHub OG</span>
                                  </span>
                                  {isCurrent && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                                      <Check className="w-2.5 h-2.5" />
                                      <span>Current Cover</span>
                                    </span>
                                  )}
                                </div>
                              }
                            />
                          </div>

                          <div className="text-xs">
                            <div className="flex items-center gap-1.5">
                              <Github className="w-3.5 h-3.5 text-foreground shrink-0" />
                              <span className="font-semibold text-foreground block truncate">
                                GitHub Open Graph Social Card
                              </span>
                            </div>
                            <span dir="ltr" className="text-[10px] font-mono text-muted-foreground block text-left truncate">
                              projects/github-og/ • Dual-tier WebP
                            </span>
                          </div>
                        </div>

                        {/* Card Controls */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60 mt-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleSetCover(
                                ogUrl,
                                ogUrl,
                                `${project.title?.en || "Project"} - GitHub Open Graph`,
                                ogLowRes || undefined
                              )
                            }
                            disabled={isCurrent || Boolean(isSettingCover)}
                            className={`flex-1 h-8 px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg transition-colors ${
                              isCurrent
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 cursor-default"
                                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                            }`}
                          >
                            {isSettingCover === ogUrl ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : isCurrent ? (
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Star className="w-3 h-3" />
                            )}
                            <span>{isCurrent ? "Current Cover" : "★ Set as Cover"}</span>
                          </button>

                          <CustomTooltip content="Re-fetch latest OG from GitHub and re-process WebP" side="top">
                            <button
                              type="button"
                              onClick={handleFetchOg}
                              disabled={isFetchingOg || !githubRepoFullName}
                              className="h-8 px-2.5 inline-flex items-center gap-1 rounded-lg border border-border text-xs font-bold text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingOg ? "animate-spin text-primary" : ""}`} />
                              <span>{isFetchingOg ? "Fetching..." : "Re-fetch OG"}</span>
                            </button>
                          </CustomTooltip>
                        </div>
                      </div>
                    );
                  }

                  // Dashed placeholder card when GitHub OG is not yet in Supabase
                  return (
                    <div
                      key="github-og-placeholder"
                      className="flex flex-col justify-between rounded-xl overflow-hidden border border-dashed border-border bg-muted/20 p-4 text-xs space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-foreground">
                            <Github className="w-4 h-4 shrink-0" />
                            <span>GitHub Open Graph</span>
                          </div>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-muted border border-border">
                            Not Cached
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          No sovereign GitHub OpenGraph asset cached in Supabase Storage yet.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleFetchOg}
                        disabled={isFetchingOg || !githubRepoFullName}
                        className="w-full h-8 px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors disabled:opacity-50"
                      >
                        {isFetchingOg ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <DownloadCloud className="w-3.5 h-3.5" />
                        )}
                        <span>{isFetchingOg ? "Processing WebP..." : "Fetch GitHub OG"}</span>
                      </button>
                    </div>
                  );
                })()}

                {/* 2. Automated Action Captures (Screenshots & GIFs) */}
                {mediaData?.captures?.map((capture, cIdx) => {
                  const isCurrent = isCurrentCover(capture.url);
                  return (
                    <div
                      key={capture.url || cIdx}
                      className={`flex flex-col justify-between rounded-xl overflow-hidden border p-3 transition-all ${
                        isCurrent
                          ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30"
                          : "border-border bg-background hover:border-border/80"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/40">
                          <ProjectThumbnail
                            sanityCoverUrl={capture.url || undefined}
                            repoFullName={githubRepoFullName || undefined}
                            alt={capture.name}
                            aspectRatio="aspect-video"
                            badge={
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white shadow-xs">
                                  {capture.type === "GIF" ? (
                                    <Film className="w-2.5 h-2.5" />
                                  ) : (
                                    <Camera className="w-2.5 h-2.5" />
                                  )}
                                  <span>{capture.type === "GIF" ? "Capture: GIF" : "Capture: Screenshot"}</span>
                                </span>
                                {isCurrent && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>Current Cover</span>
                                  </span>
                                )}
                              </div>
                            }
                          />
                        </div>

                        <div className="text-xs">
                          <span className="font-semibold text-foreground block truncate">
                            {capture.name}
                          </span>
                          <span dir="ltr" className="text-[10px] font-mono text-muted-foreground block text-left truncate">
                            projects/captures/ • {capture.type}
                          </span>
                        </div>
                      </div>

                      {/* Card Controls */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60 mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleSetCover(
                              capture.url,
                              capture.url,
                              `${project.title?.en || "Project"} - ${capture.name}`,
                              capture.lowResUrl || undefined
                            )
                          }
                          disabled={isCurrent || Boolean(isSettingCover)}
                          className={`flex-1 h-8 px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg transition-colors ${
                            isCurrent
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 cursor-default"
                              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                          }`}
                        >
                          {isSettingCover === capture.url ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : isCurrent ? (
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Star className="w-3 h-3" />
                          )}
                          <span>{isCurrent ? "Current Cover" : "★ Set as Cover"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* 3. Uploaded Gallery Media Assets */}
                {project.gallery?.map((item, idx) => {
                  const assetId = item.asset?._id || item.asset?._ref || "";
                  const assetUrl = item.asset?.url;
                  const isCurrent = isCurrentCover(assetUrl, assetId);

                  return (
                    <div
                      key={item._key || idx}
                      className={`flex flex-col justify-between rounded-xl overflow-hidden border p-3 transition-all ${
                        isCurrent
                          ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30"
                          : "border-border bg-background hover:border-border/80"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/40">
                          <ProjectThumbnail
                            sanityCoverUrl={assetUrl}
                            sanityAssetId={assetId}
                            repoFullName={project.github}
                            alt={item.caption || "Media asset"}
                            aspectRatio="aspect-video"
                            badge={
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900/90 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs">
                                  <ImageIcon className="w-2.5 h-2.5" />
                                  <span>Custom Upload</span>
                                </span>
                                {isCurrent && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>Current Cover</span>
                                  </span>
                                )}
                              </div>
                            }
                          />
                        </div>

                        <div className="text-xs">
                          <span className="font-semibold text-foreground block truncate">
                            {item.caption || `Image ${idx + 1}`}
                          </span>
                          <span dir="ltr" className="text-[10px] font-mono text-muted-foreground block text-left truncate">
                            {assetId ? `ref: ${assetId}` : "projects/covers/"}
                          </span>
                        </div>
                      </div>

                      {/* Card Controls */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60 mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleSetCover(assetId, assetUrl, item.alt || item.caption)
                          }
                          disabled={isCurrent || Boolean(isSettingCover)}
                          className={`flex-1 h-8 px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg transition-colors ${
                            isCurrent
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 cursor-default"
                              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                          }`}
                        >
                          {isSettingCover === assetId ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : isCurrent ? (
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Star className="w-3 h-3" />
                          )}
                          <span>{isCurrent ? "Current Cover" : "★ Set as Cover"}</span>
                        </button>

                        <CustomTooltip content="Remove from media" side="top">
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(item._key)}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </CustomTooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
