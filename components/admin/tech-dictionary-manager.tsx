"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Sparkles,
  ArrowLeft,
  Check,
  X,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Tag,
  Globe,
  Languages,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Layers,
} from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { DeveloperTelemetryToggle } from "./developer-telemetry-toggle";
import { getTechIcon } from "@/lib/tech/icons";
import { useTelemetryStore } from "@/lib/stores/use-telemetry-store";
import type { TechDefinition } from "@prisma/client";

interface TechDictionaryManagerProps {
  locale: string;
}

const CATEGORIES = [
  "all",
  "frontend",
  "backend",
  "database",
  "devops",
  "ai",
  "styling",
  "testing",
  "mobile",
  "other",
] as const;

export function TechDictionaryManager({ locale }: TechDictionaryManagerProps) {
  const { isTelemetryEnabled } = useTelemetryStore();

  const [techs, setTechs] = useState<TechDefinition[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Expanded bilingual summaries per row
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Inline alias addition state: { [techId]: string }
  const [activeInlineAlias, setActiveInlineAlias] = useState<string | null>(null);
  const [newAliasValue, setNewAliasValue] = useState("");
  const [isSavingAlias, setIsSavingAlias] = useState(false);

  // Modals state
  const [editingTech, setEditingTech] = useState<TechDefinition | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [deletingTech, setDeletingTech] = useState<TechDefinition | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = useCallback(
    (text: string, type: "success" | "error" | "info" = "success") => {
      setToastMessage({ text, type });
      setTimeout(() => {
        setToastMessage((prev) => (prev?.text === text ? null : prev));
      }, 4500);
    },
    []
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Techs
  const fetchTechs = useCallback(async () => {
    setIsLoading(true);
    const startTime = Date.now();
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/techs?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load techs: ${res.statusText}`);
      }

      const resData = await res.json();
      setTechs(resData.data || []);
      setTotal(resData.total || 0);

      const durationMs = Date.now() - startTime;
      if (isTelemetryEnabled) {
        showToast(
          `[DB Cache Hit] Retrieved ${resData.data?.length || 0} tech definitions in ${durationMs}ms`,
          "info"
        );
      }
    } catch (err: any) {
      showToast(err.message || "Failed to fetch tech definitions", "error");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedCategory, isTelemetryEnabled, showToast]);

  useEffect(() => {
    fetchTechs();
  }, [fetchTechs]);

  // Toggle expanded summary
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Quick Remove Alias
  const handleRemoveAlias = async (tech: TechDefinition, aliasToRemove: string) => {
    const updatedAliases = tech.aliases.filter((a) => a !== aliasToRemove);
    try {
      const res = await fetch(`/api/admin/techs/${tech.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aliases: updatedAliases }),
      });

      if (!res.ok) throw new Error("Failed to remove alias.");
      const updated = await res.json();

      setTechs((prev) =>
        prev.map((t) => (t.id === tech.id ? { ...t, aliases: updatedAliases } : t))
      );
      showToast(`Removed alias "${aliasToRemove}" from ${tech.name}.`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to remove alias.", "error");
    }
  };

  // Quick Add Alias
  const handleAddAlias = async (tech: TechDefinition) => {
    const clean = newAliasValue.trim().toLowerCase();
    if (!clean) {
      setActiveInlineAlias(null);
      return;
    }

    if (tech.aliases.includes(clean) || clean === tech.slug) {
      showToast("Alias or slug already exists.", "error");
      return;
    }

    setIsSavingAlias(true);
    const updatedAliases = [...tech.aliases, clean];

    try {
      const res = await fetch(`/api/admin/techs/${tech.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aliases: updatedAliases }),
      });

      if (!res.ok) throw new Error("Failed to add alias.");

      setTechs((prev) =>
        prev.map((t) => (t.id === tech.id ? { ...t, aliases: updatedAliases } : t))
      );
      showToast(`Added alias "${clean}" to ${tech.name}.`, "success");
      setNewAliasValue("");
      setActiveInlineAlias(null);
    } catch (err: any) {
      showToast(err.message || "Failed to add alias.", "error");
    } finally {
      setIsSavingAlias(false);
    }
  };

  // Regenerate single tech via Gemini
  const handleRegenerate = async (tech: TechDefinition) => {
    setRegeneratingId(tech.id);
    const startTime = Date.now();
    try {
      showToast(`Synthesizing "${tech.name}" via Gemini AI...`, "info");
      const res = await fetch(`/api/admin/techs/${tech.id}/regenerate`, {
        method: "POST",
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || "Failed to regenerate tech definition.");
      }

      const updated = resData.data as TechDefinition;
      setTechs((prev) => prev.map((t) => (t.id === tech.id ? updated : t)));

      const durationMs = Date.now() - startTime;
      showToast(
        `[Gemini API] Re-synthesized "${updated.name}" with ${updated.aliases.length} aliases in ${durationMs}ms`,
        "success"
      );
    } catch (err: any) {
      showToast(err.message || "Regeneration failed.", "error");
    } finally {
      setRegeneratingId(null);
    }
  };

  // Delete Tech
  const handleDelete = async () => {
    if (!deletingTech) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/techs/${deletingTech.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete tech definition.");

      setTechs((prev) => prev.filter((t) => t.id !== deletingTech.id));
      setTotal((prev) => Math.max(0, prev - 1));
      showToast(`Deleted tech definition "${deletingTech.name}".`, "success");
      setDeletingTech(null);
    } catch (err: any) {
      showToast(err.message || "Deletion failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save (Create or Edit)
  const handleSaveModal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string)?.trim();
    const slug = (formData.get("slug") as string)?.trim().toLowerCase();
    const category = (formData.get("category") as string)?.trim().toLowerCase();
    const icon = (formData.get("icon") as string)?.trim() || null;
    const summaryEn = (formData.get("summaryEn") as string)?.trim();
    const summaryFa = (formData.get("summaryFa") as string)?.trim();
    const rawAliases = (formData.get("aliases") as string) || "";

    const aliases = Array.from(
      new Set(
        rawAliases
          .split(",")
          .map((a) => a.trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const payload = { name, slug, category, icon, summaryEn, summaryFa, aliases };

    try {
      if (editingTech) {
        // PATCH
        const res = await fetch(`/api/admin/techs/${editingTech.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.message || "Failed to update tech.");

        const updated = resData.data;
        setTechs((prev) => prev.map((t) => (t.id === editingTech.id ? updated : t)));
        showToast(`Updated "${updated.name}" successfully!`, "success");
        setEditingTech(null);
      } else {
        // POST
        const res = await fetch("/api/admin/techs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.message || "Failed to create tech.");

        const created = resData.data;
        setTechs((prev) => [created, ...prev]);
        setTotal((prev) => prev + 1);
        showToast(`Created "${created.name}" successfully!`, "success");
        setIsNewModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save tech definition.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for category badge styling
  const getCategoryBadgeClass = (category?: string | null) => {
    switch (category?.toLowerCase()) {
      case "frontend":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
      case "backend":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "database":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "devops":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "ai":
        return "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20";
      case "styling":
        return "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
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
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
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
            { label: "Tech Dictionary", current: true },
          ]}
        />

        <div className="flex items-center gap-2.5">
          <DeveloperTelemetryToggle onToast={showToast} compact />
          <Link
            href={`/${locale}/admin?view=grid`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>Back to Projects</span>
          </Link>
        </div>
      </div>

      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Canonical Tech Dictionary
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage technology definitions, self-learning aliases, and bilingual summaries.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchTechs}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Tech</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, canonical slug, or alias..."
              className="w-full ps-9 pe-3 py-2 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-muted-foreground font-medium">
            Showing <span className="font-bold text-foreground">{techs.length}</span> of{" "}
            <span className="font-bold text-foreground">{total}</span> definitions
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold capitalize whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/30 border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Data Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Technology & Slug</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Assigned Aliases</th>
                <th className="py-3 px-4">Bilingual Summaries</th>
                <th className="py-3 px-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && techs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      <span>Loading canonical tech definitions...</span>
                    </div>
                  </td>
                </tr>
              ) : techs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">No technology definitions found</p>
                    <p className="text-xs">Try adjusting your search or add a new technology.</p>
                  </td>
                </tr>
              ) : (
                techs.map((tech) => {
                  const isRegenerating = regeneratingId === tech.id;
                  const isExpanded = Boolean(expandedIds[tech.id]);
                  const brandIcon = getTechIcon(
                    tech.icon || tech.slug || tech.name,
                    "w-4 h-4 shrink-0"
                  );

                  return (
                    <React.Fragment key={tech.id}>
                      <tr className="hover:bg-muted/20 transition-colors">
                        {/* 1. Technology & Slug */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-muted/50 border border-border flex items-center justify-center shrink-0 text-foreground">
                              {brandIcon || (
                                <span className="font-bold text-xs uppercase">
                                  {tech.name.slice(0, 2)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground text-sm leading-tight">
                                {tech.name}
                              </p>
                              <p className="text-[11px] font-mono text-muted-foreground">
                                /{tech.slug}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Category */}
                        <td className="py-3.5 px-4 align-top">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getCategoryBadgeClass(
                              tech.category
                            )}`}
                          >
                            {tech.category || "other"}
                          </span>
                        </td>

                        {/* 3. Aliases Tag List */}
                        <td className="py-3.5 px-4 align-top max-w-xs">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {tech.aliases.map((alias) => (
                              <span
                                key={alias}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-muted/60 border border-border/80 text-foreground group"
                              >
                                <span>{alias}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAlias(tech, alias)}
                                  className="text-muted-foreground hover:text-red-500 opacity-60 group-hover:opacity-100 transition-opacity"
                                  title={`Remove alias "${alias}"`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}

                            {/* Inline Add Alias Button / Input */}
                            {activeInlineAlias === tech.id ? (
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={newAliasValue}
                                  onChange={(e) => setNewAliasValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAddAlias(tech);
                                    if (e.key === "Escape") {
                                      setActiveInlineAlias(null);
                                      setNewAliasValue("");
                                    }
                                  }}
                                  placeholder="new-alias"
                                  className="w-24 px-1.5 py-0.5 text-[10px] font-mono bg-background border border-primary rounded focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddAlias(tech)}
                                  disabled={isSavingAlias}
                                  className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                  <Check className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveInlineAlias(null);
                                    setNewAliasValue("");
                                  }}
                                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveInlineAlias(tech.id);
                                  setNewAliasValue("");
                                }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
                                title="Add alias"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>alias</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 4. Bilingual Summaries */}
                        <td className="py-3.5 px-4 align-top max-w-md">
                          <button
                            type="button"
                            onClick={() => toggleExpand(tech.id)}
                            className="w-full text-left flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
                          >
                            <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                              {tech.summaryEn || "No English summary recorded."}
                            </p>
                            <span className="text-muted-foreground shrink-0 mt-0.5">
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </span>
                          </button>
                        </td>

                        {/* 5. Actions Column */}
                        <td className="py-3.5 px-4 align-top text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Regenerate with Gemini */}
                            <button
                              type="button"
                              onClick={() => handleRegenerate(tech)}
                              disabled={isRegenerating}
                              title="Re-synthesize summaries & derive aliases via Gemini"
                              className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                isRegenerating
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse"
                                  : "bg-muted/40 border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5"
                              }`}
                            >
                              {isRegenerating ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              )}
                            </button>

                            {/* Edit Modal Button */}
                            <button
                              type="button"
                              onClick={() => setEditingTech(tech)}
                              title="Edit definition"
                              className="p-1.5 rounded-lg border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setDeletingTech(tech)}
                              title="Delete definition"
                              className="p-1.5 rounded-lg border border-border bg-muted/40 text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Bilingual Summary Drawer */}
                      {isExpanded && (
                        <tr className="bg-muted/10 border-b border-border/60">
                          <td colSpan={5} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card/60 p-4 rounded-xl border border-border/80">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                  <Globe className="w-3.5 h-3.5 text-sky-500" />
                                  <span>English Summary</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {tech.summaryEn || "No summary provided."}
                                </p>
                              </div>

                              <div className="space-y-1" dir="rtl">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                  <Languages className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>خلاصه به زبان فارسی</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                                  {tech.summaryFa || "خلاصه‌ای ثبت نشده است."}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {(isNewModalOpen || editingTech) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>{editingTech ? `Edit "${editingTech.name}"` : "Create New Technology"}</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsNewModalOpen(false);
                  setEditingTech(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Canonical Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Display Name *</label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={editingTech?.name || ""}
                    placeholder="e.g. Next.js"
                    className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Slug */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Canonical Slug</label>
                  <input
                    name="slug"
                    type="text"
                    defaultValue={editingTech?.slug || ""}
                    placeholder="e.g. nextjs (auto-generated if empty)"
                    className="w-full px-3 py-2 text-xs font-mono bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <select
                    name="category"
                    defaultValue={editingTech?.category || "frontend"}
                    className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  >
                    {CATEGORIES.filter((c) => c !== "all").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Icon Identifier */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Icon Identifier</label>
                  <input
                    name="icon"
                    type="text"
                    defaultValue={editingTech?.icon || ""}
                    placeholder="SimpleIcons slug (e.g. react, nextdotjs)"
                    className="w-full px-3 py-2 text-xs font-mono bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Aliases */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Known Aliases (Comma-separated)
                </label>
                <input
                  name="aliases"
                  type="text"
                  defaultValue={editingTech?.aliases?.join(", ") || ""}
                  placeholder="e.g. next.js, next-js, nextjs"
                  className="w-full px-3 py-2 text-xs font-mono bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              {/* English Summary */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Summary (English)</label>
                <textarea
                  name="summaryEn"
                  rows={3}
                  defaultValue={editingTech?.summaryEn || ""}
                  placeholder="Technical summary of the technology..."
                  className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              {/* Persian Summary */}
              <div className="space-y-1" dir="rtl">
                <label className="text-xs font-semibold text-foreground block text-right font-sans">
                  خلاصه به فارسی
                </label>
                <textarea
                  name="summaryFa"
                  rows={3}
                  defaultValue={editingTech?.summaryFa || ""}
                  placeholder="توضیح فنی مختصر به زبان فارسی..."
                  className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary font-sans text-right"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewModalOpen(false);
                    setEditingTech(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTech ? "Save Changes" : "Create Definition"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTech && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Delete "{deletingTech.name}"?
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Are you sure you want to delete this canonical tech definition? Future lookups for
                this technology or its aliases will trigger a cache miss.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTech(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-500 flex items-center gap-1.5"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Definition</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
