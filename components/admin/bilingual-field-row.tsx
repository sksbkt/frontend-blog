"use client";

import React from "react";
import { Sparkles, RefreshCw, Wand2, ArrowRightLeft, Languages } from "lucide-react";
import { CustomTooltip } from "@/components/ui/custom-tooltip";

export interface BilingualFieldRowProps {
  label: string;
  fieldName: "title" | "description" | "overview" | "tagline" | "challenges" | "outcome";
  enValue: string;
  faValue: string;
  onChangeEn: (value: string) => void;
  onChangeFa: (value: string) => void;
  hasAiDigest: boolean;
  onRefine: (fieldName: string) => void | Promise<void>;
  onPolish: (fieldName: string, sourceLanguage: "en" | "fa", currentText: string) => void | Promise<void>;
  isRefining?: boolean;
  isPolishing?: "en" | "fa" | null;
  isHighlighted?: boolean;
  multiline?: boolean;
  rows?: number;
  placeholderEn?: string;
  placeholderFa?: string;
  required?: boolean;
  descriptionHint?: string;
}

export function BilingualFieldRow({
  label,
  fieldName,
  enValue,
  faValue,
  onChangeEn,
  onChangeFa,
  hasAiDigest,
  onRefine,
  onPolish,
  isRefining = false,
  isPolishing = null,
  isHighlighted = false,
  multiline = true,
  rows = 3,
  placeholderEn = "",
  placeholderFa = "",
  required = false,
  descriptionHint,
}: BilingualFieldRowProps) {
  const isEnPolishingActive = isPolishing === "en";
  const isFaPolishingActive = isPolishing === "fa";

  const isEnSyncingSibling = isFaPolishingActive;
  const isFaSyncingSibling = isEnPolishingActive;

  const isBusy = isRefining || Boolean(isPolishing);

  return (
    <div className="space-y-2.5 p-4 rounded-2xl border border-border/80 bg-card/60 shadow-2xs hover:border-border transition-colors">
      {/* =================================================================== */}
      {/* ROW HEADER & REFINE ACTION */}
      {/* =================================================================== */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm font-bold text-foreground">
              {label}
            </label>
            {required && (
              <CustomTooltip content="Required field" side="top">
                <span className="text-rose-500 font-mono text-xs cursor-help">
                  *
                </span>
              </CustomTooltip>
            )}
          </div>
          {descriptionHint && (
            <p className="text-[11px] text-muted-foreground">{descriptionHint}</p>
          )}
        </div>

        {/* Row Action: Refine Pair */}
        <CustomTooltip
          content={
            hasAiDigest
              ? "Re-extract and regenerate both English and Persian fields from the AI dossier."
              : "Run Deep Scan first to enable AI actions."
          }
          side="top"
        >
          <span className="inline-block">
            <button
              type="button"
              onClick={() => onRefine(fieldName)}
              disabled={isBusy || !hasAiDigest}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-[0.98] shadow-2xs ${
                !hasAiDigest
                  ? "opacity-40 cursor-not-allowed border-border text-muted-foreground bg-muted/30"
                  : isRefining
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse cursor-wait"
                  : "border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary hover:border-primary/50"
              }`}
            >
              {isRefining ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
              <span>{isRefining ? "Refining Pair..." : "Refine Pair"}</span>
            </button>
          </span>
        </CustomTooltip>
      </div>

      {/* =================================================================== */}
      {/* DUAL-COLUMN EDITOR GRID */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ----------------------------------------------------------------- */}
        {/* LEFT COLUMN: ENGLISH (LTR) */}
        {/* ----------------------------------------------------------------- */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>English (LTR)</span>
              {isEnSyncingSibling && (
                <span className="inline-flex items-center gap-1 text-[10px] text-blue-500 animate-pulse font-mono">
                  <ArrowRightLeft className="w-2.5 h-2.5 animate-spin" />
                  <span>Syncing translation...</span>
                </span>
              )}
            </span>

            {/* Polish Button for English */}
            <CustomTooltip
              content={
                hasAiDigest
                  ? "Polish English phrasing and automatically update the Persian translation."
                  : "Run Deep Scan first to enable AI actions."
              }
              side="top"
            >
              <span className="inline-block">
                <button
                  type="button"
                  onClick={() => onPolish(fieldName, "en", enValue)}
                  disabled={isBusy || !hasAiDigest || !enValue.trim()}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all active:scale-[0.98] ${
                    !hasAiDigest || !enValue.trim()
                      ? "opacity-30 cursor-not-allowed border-border text-muted-foreground bg-muted/20"
                      : isEnPolishingActive
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse"
                      : "border-border hover:border-blue-500/40 bg-card hover:bg-blue-500/10 text-foreground hover:text-blue-600 dark:hover:text-blue-400 shadow-2xs"
                  }`}
                >
                  {isEnPolishingActive ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3 text-blue-500 shrink-0" />
                  )}
                  <span>{isEnPolishingActive ? "Polishing..." : "Polish & Sync"}</span>
                </button>
              </span>
            </CustomTooltip>
          </div>

          {multiline ? (
            <textarea
              dir="ltr"
              rows={rows}
              value={enValue}
              onChange={(e) => onChangeEn(e.target.value)}
              placeholder={placeholderEn}
              required={required}
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border bg-background text-foreground leading-relaxed transition-all resize-y ${
                isHighlighted
                  ? "border-emerald-500 ring-2 ring-emerald-500/20"
                  : isRefining
                  ? "border-amber-500/60 ring-2 ring-amber-500/20 animate-pulse bg-amber-500/5"
                  : isEnPolishingActive
                  ? "border-blue-500/60 ring-2 ring-blue-500/20 animate-pulse bg-blue-500/5"
                  : isEnSyncingSibling
                  ? "border-blue-500/40 ring-1 ring-blue-500/20 bg-blue-500/5"
                  : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
              }`}
            />
          ) : (
            <input
              type="text"
              dir="ltr"
              value={enValue}
              onChange={(e) => onChangeEn(e.target.value)}
              placeholder={placeholderEn}
              required={required}
              className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-background text-foreground transition-all ${
                isHighlighted
                  ? "border-emerald-500 ring-2 ring-emerald-500/20"
                  : isRefining
                  ? "border-amber-500/60 ring-2 ring-amber-500/20 animate-pulse bg-amber-500/5"
                  : isEnPolishingActive
                  ? "border-blue-500/60 ring-2 ring-blue-500/20 animate-pulse bg-blue-500/5"
                  : isEnSyncingSibling
                  ? "border-blue-500/40 ring-1 ring-blue-500/20 bg-blue-500/5"
                  : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
              }`}
            />
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT COLUMN: PERSIAN (RTL) */}
        {/* ----------------------------------------------------------------- */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>فارسی (RTL)</span>
              {isFaSyncingSibling && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 animate-pulse font-mono">
                  <ArrowRightLeft className="w-2.5 h-2.5 animate-spin" />
                  <span>همگام‌سازی ترجمه...</span>
                </span>
              )}
            </span>

            {/* Polish Button for Persian */}
            <CustomTooltip
              content={
                hasAiDigest
                  ? "Polish Persian phrasing and automatically update the English translation."
                  : "Run Deep Scan first to enable AI actions."
              }
              side="top"
            >
              <span className="inline-block">
                <button
                  type="button"
                  onClick={() => onPolish(fieldName, "fa", faValue)}
                  disabled={isBusy || !hasAiDigest || !faValue.trim()}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all active:scale-[0.98] ${
                    !hasAiDigest || !faValue.trim()
                      ? "opacity-30 cursor-not-allowed border-border text-muted-foreground bg-muted/20"
                      : isFaPolishingActive
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse"
                      : "border-border hover:border-emerald-500/40 bg-card hover:bg-emerald-500/10 text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 shadow-2xs"
                  }`}
                >
                  {isFaPolishingActive ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  )}
                  <span>{isFaPolishingActive ? "در حال بهبود..." : "Polish & Sync"}</span>
                </button>
              </span>
            </CustomTooltip>
          </div>

          {multiline ? (
            <textarea
              dir="rtl"
              rows={rows}
              value={faValue}
              onChange={(e) => onChangeFa(e.target.value)}
              placeholder={placeholderFa}
              required={required}
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border bg-background text-foreground leading-relaxed transition-all resize-y ${
                isHighlighted
                  ? "border-emerald-500 ring-2 ring-emerald-500/20"
                  : isRefining
                  ? "border-amber-500/60 ring-2 ring-amber-500/20 animate-pulse bg-amber-500/5"
                  : isFaPolishingActive
                  ? "border-emerald-500/60 ring-2 ring-emerald-500/20 animate-pulse bg-emerald-500/5"
                  : isFaSyncingSibling
                  ? "border-emerald-500/40 ring-1 ring-emerald-500/20 bg-emerald-500/5"
                  : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
              }`}
            />
          ) : (
            <input
              type="text"
              dir="rtl"
              value={faValue}
              onChange={(e) => onChangeFa(e.target.value)}
              placeholder={placeholderFa}
              required={required}
              className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-background text-foreground transition-all ${
                isHighlighted
                  ? "border-emerald-500 ring-2 ring-emerald-500/20"
                  : isRefining
                  ? "border-amber-500/60 ring-2 ring-amber-500/20 animate-pulse bg-amber-500/5"
                  : isFaPolishingActive
                  ? "border-emerald-500/60 ring-2 ring-emerald-500/20 animate-pulse bg-emerald-500/5"
                  : isFaSyncingSibling
                  ? "border-emerald-500/40 ring-1 ring-emerald-500/20 bg-emerald-500/5"
                  : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
