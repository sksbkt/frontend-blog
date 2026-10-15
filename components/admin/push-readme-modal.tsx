"use client";

import React, { useState } from "react";
import {
  X,
  GitPullRequest,
  GitCommit,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  GitBranch,
} from "lucide-react";
import type { PushReadmeConfig, PushSuccessResult } from "./types";

interface PushReadmeModalProps {
  config: PushReadmeConfig;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: PushSuccessResult) => void;
  showToast: (text: string, type: "success" | "error") => void;
}

export function PushReadmeModal({
  config,
  isOpen,
  onClose,
  onSuccess,
  showToast,
}: PushReadmeModalProps) {
  const [form, setForm] = useState<PushReadmeConfig>(config);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<PushSuccessResult | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPushing(true);

    try {
      const res = await fetch("/api/admin/github/sync-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to push README to GitHub.");

      setPushResult(data);
      onSuccess(data);
      showToast(
        data.mode === "pr"
          ? `Pull Request #${data.number} created successfully on GitHub!`
          : `README committed directly to branch ${data.branch}!`,
        "success"
      );
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Error pushing README to GitHub.",
        "error"
      );
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in-50 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPushing) onClose();
      }}
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              {form.mode === "pr" ? (
                <GitPullRequest className="w-5 h-5" />
              ) : (
                <GitCommit className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {form.mode === "pr" ? "Create GitHub Pull Request" : "Direct Commit to Branch"}
              </h3>
              <p dir="ltr" className="text-xs font-mono text-neutral-400 text-left">
                {form.fullName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPushing}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {pushResult ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                Sync Successfully Completed!
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {pushResult.mode === "pr"
                  ? `Pull Request #${pushResult.number} was opened on GitHub.`
                  : `README file was committed to ${pushResult.branch}.`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href={pushResult.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold rounded-xl text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs"
              >
                <span>View on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Mode switch */}
            <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: "pr" })}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  form.mode === "pr"
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                Create Pull Request
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: "direct" })}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  form.mode === "direct"
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                Direct Commit
              </button>
            </div>

            {/* Target Branch */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Target Branch
              </label>
              <div className="relative">
                <GitBranch className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  dir="ltr"
                  value={form.targetBranch}
                  onChange={(e) => setForm({ ...form, targetBranch: e.target.value })}
                  className="w-full ps-9 pe-3 py-2 text-xs font-mono rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* PR Branch Name */}
            {form.mode === "pr" && (
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  New PR Branch Name
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.branchName}
                  onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  required
                />
              </div>
            )}

            {/* Commit Message */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Commit Message
              </label>
              <input
                type="text"
                dir="ltr"
                value={form.commitMessage}
                onChange={(e) => setForm({ ...form, commitMessage: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPushing}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPushing}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPushing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{form.mode === "pr" ? "Open Pull Request" : "Push Commit"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
