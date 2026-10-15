"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Sparkles,
  ShieldCheck,
  Camera,
  Server,
  ExternalLink,
  RefreshCw,
  Eye,
  FileCode,
} from "lucide-react";
import { FaGithub as Github } from "react-icons/fa";
import { useTranslations } from "next-intl";
import type { RepositoryItem, SanityProject } from "./types";

interface RepoActionsMenuProps {
  repo: RepositoryItem;
  matchingPublished?: SanityProject;
  matchingDraft?: SanityProject;
  locale: string;
  isAnalyzing: boolean;
  isAuditing: boolean;
  isDeployingVercel: boolean;
  isCiCapturing: boolean;
  dropUp?: boolean;
  onAnalyze: () => void;
  onAudit: () => void;
  onDeployVercel: () => void;
  onCaptureAssets: () => void;
}

export function RepoActionsMenu({
  repo,
  matchingPublished,
  matchingDraft,
  locale,
  isAnalyzing,
  isAuditing,
  isDeployingVercel,
  isCiCapturing,
  dropUp = false,
  onAnalyze,
  onAudit,
  onDeployVercel,
  onCaptureAssets,
}: RepoActionsMenuProps) {
  const t = useTranslations("admin.masterDetail.actions");
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-start" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t("moreActions")}
        aria-expanded={isOpen}
        className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shadow-xs"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute end-0 ${
            dropUp ? "bottom-full mb-2" : "top-full mt-2"
          } w-56 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 p-1.5 shadow-xl z-50 animate-in fade-in-50 zoom-in-95 duration-150 backdrop-blur-md`}
        >
          {/* Action: AI Generate / Re-generate Draft */}
          <button
            type="button"
            role="menuitem"
            disabled={isAnalyzing}
            onClick={() => {
              setIsOpen(false);
              onAnalyze();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-start text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span className="truncate">
              {repo.importStatus !== "none" ? t("reGenerate") : t("quickGenerate")}
            </span>
          </button>

          {/* Action: Run AI Audit */}
          <button
            type="button"
            role="menuitem"
            disabled={isAuditing}
            onClick={() => {
              setIsOpen(false);
              onAudit();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-start text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {isAuditing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
            )}
            <span className="truncate">{t("quickAudit")}</span>
          </button>

          {/* Action: Deploy to Vercel */}
          <button
            type="button"
            role="menuitem"
            disabled={isDeployingVercel}
            onClick={() => {
              setIsOpen(false);
              onDeployVercel();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-start text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <Server className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="truncate">{t("quickDeploy")}</span>
          </button>

          {/* Action: Capture Visual Assets */}
          <button
            type="button"
            role="menuitem"
            disabled={isCiCapturing}
            onClick={() => {
              setIsOpen(false);
              onCaptureAssets();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-start text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {isCiCapturing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-purple-500 shrink-0" />
            ) : (
              <Camera className="w-4 h-4 text-purple-500 shrink-0" />
            )}
            <span className="truncate">{t("quickCapture")}</span>
          </button>

          <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

          {/* External: View live portfolio page */}
          {matchingPublished && (
            <a
              href={`/${locale}/projects/${matchingPublished.slug.current}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 shrink-0" />
                <span>View on Site</span>
              </span>
              <ExternalLink className="w-3 h-3 text-neutral-400 rtl:rotate-180" />
            </a>
          )}

          {/* External: View GitHub Repository */}
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Github className="w-4 h-4 shrink-0" />
              <span>GitHub Repo</span>
            </span>
            <ExternalLink className="w-3 h-3 text-neutral-400 rtl:rotate-180" />
          </a>
        </div>
      )}
    </div>
  );
}
