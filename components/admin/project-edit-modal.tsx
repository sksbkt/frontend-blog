"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  X,
  FileCode,
  Layers,
  Camera,
  Trash2,
  Plus,
  RefreshCw,
  Check,
  Upload,
  Globe,
  Star,
} from "lucide-react";
import { FaGithub as Github } from "react-icons/fa";
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import type { SanityProject, ImageAssetRef } from "./types";

interface ProjectEditModalProps {
  project: SanityProject;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: SanityProject) => Promise<void>;
  showToast: (text: string, type: "success" | "error") => void;
}

export function ProjectEditModal({
  project,
  isOpen,
  onClose,
  onSave,
  showToast,
}: ProjectEditModalProps) {
  const [form, setForm] = useState<SanityProject>(project);
  const [activeTab, setActiveTab] = useState<"general" | "content" | "media">("general");
  const [isSaving, setIsSaving] = useState(false);
  const [newTech, setNewTech] = useState("");

  if (!isOpen) return null;

  const handleAddTech = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTech.trim();
    if (!clean) return;
    if (form.technologies.includes(clean)) return;
    setForm({ ...form, technologies: [...form.technologies, clean] });
    setNewTech("");
  };

  const handleRemoveTech = (tech: string) => {
    setForm({ ...form, technologies: form.technologies.filter((t) => t !== tech) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(form);
      showToast("Project updated successfully in database!", "success");
      onClose();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to save project changes.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in-50 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Review &amp; Edit Project in CMS
              </h3>
              <p dir="ltr" className="text-xs font-mono text-neutral-400 text-left">
                {form.title?.en || form.slug?.current}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "general"
                ? "border-neutral-900 dark:border-white text-neutral-900 dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            General &amp; Metadata
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "content"
                ? "border-neutral-900 dark:border-white text-neutral-900 dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            Bilingual Story &amp; Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("media")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "media"
                ? "border-neutral-900 dark:border-white text-neutral-900 dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            Media
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB: GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    English Title
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={form.title?.en || ""}
                    onChange={(e) =>
                      setForm({ ...form, title: { ...form.title, en: e.target.value } })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    عنوان فارسی
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={form.title?.fa || ""}
                    onChange={(e) =>
                      setForm({ ...form, title: { ...form.title, fa: e.target.value } })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.slug?.current || ""}
                  onChange={(e) =>
                    setForm({ ...form, slug: { current: e.target.value } })
                  }
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    GitHub URL
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={form.github || ""}
                    onChange={(e) => setForm({ ...form, github: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Live Demo URL
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={form.demo || ""}
                    onChange={(e) => setForm({ ...form, demo: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Technologies */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  Technologies (Strictly LTR)
                </label>
                <div dir="ltr" className="flex flex-wrap gap-1.5 mb-2 text-left">
                  {form.technologies?.map((tech) => (
                    <span
                      key={tech}
                      dir="ltr"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200"
                    >
                      <span>{tech}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(tech)}
                        className="text-neutral-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="Add technology (e.g. Tailwind CSS)..."
                    value={newTech}
                    onChange={(e) => setNewTech(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddTech}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONTENT (BILINGUAL) */}
          {activeTab === "content" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Description (EN)
                  </label>
                  <textarea
                    dir="ltr"
                    rows={3}
                    value={form.description?.en || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        description: { ...form.description, en: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    توضیحات کوتاه (فارسی)
                  </label>
                  <textarea
                    dir="rtl"
                    rows={3}
                    value={form.description?.fa || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        description: { ...form.description, fa: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Architecture Overview (EN)
                  </label>
                  <textarea
                    dir="ltr"
                    rows={4}
                    value={form.content?.overview?.en || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        content: {
                          ...form.content,
                          overview: { ...form.content.overview, en: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    بررسی اجمالی معماری (فارسی)
                  </label>
                  <textarea
                    dir="rtl"
                    rows={4}
                    value={form.content?.overview?.fa || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        content: {
                          ...form.content,
                          overview: { ...form.content.overview, fa: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Challenges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Technical Challenges (EN)
                  </label>
                  <textarea
                    dir="ltr"
                    rows={3}
                    value={form.content?.challenges?.en || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        content: {
                          ...form.content,
                          challenges: { ...form.content.challenges, en: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    چالش‌های فنی (فارسی)
                  </label>
                  <textarea
                    dir="rtl"
                    rows={3}
                    value={form.content?.challenges?.fa || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        content: {
                          ...form.content,
                          challenges: { ...form.content.challenges, fa: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: MEDIA */}
          {activeTab === "media" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-2">
                  Current Cover Image Preview
                </label>
                <div className="relative aspect-video rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 max-w-md">
                  <Image
                    src={
                      form.coverImage?.asset?.url ||
                      form.image?.asset?.url ||
                      "/placeholder-project.png"
                    }
                    alt="Cover preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>

              {/* Gallery Items */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-2">
                  Media Assets ({form.gallery?.length || 0})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {form.gallery?.map((item) => (
                    <div
                      key={item._key}
                      className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 aspect-video group"
                    >
                      <Image
                        src={item.asset?.url || "/placeholder-project.png"}
                        alt={item.caption || "Gallery item"}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <CustomTooltip content="Remove image" side="top">
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              gallery: form.gallery?.filter((g) => g._key !== item._key),
                            })
                          }
                          className="absolute top-1.5 end-1.5 p-1 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </CustomTooltip>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
