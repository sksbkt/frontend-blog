"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, RefreshCw, Loader2, ShieldCheck, Play } from "lucide-react";
import { useLocale } from "next-intl";
import { CustomTooltip } from "@/components/ui/custom-tooltip";

export interface ProjectAuditBreakdown {
  score: number;
  breakdown: {
    languages: number;
    assets: number;
    architecture: number;
    technologies: number;
  };
  strengths: string[];
  weaknesses: string[];
  strengthsFa?: string[];
  weaknessesFa?: string[];
  auditedAt?: string;
}

export interface ProjectAuditBadgeProps {
  project: {
    id: string;
    slug?: string;
    auditScore?: number | null;
    auditBreakdown?: ProjectAuditBreakdown | null;
    auditedAt?: string | null;
  };
  isAdmin?: boolean;
  locale?: string;
  className?: string;
  onAuditUpdated?: (report: ProjectAuditBreakdown) => void;
}

function toPersianDigits(n: number | string): string {
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(n).replace(/[0-9]/g, (w) => farsiDigits[+w]);
}

export function ProjectAuditBadge({
  project,
  isAdmin = false,
  locale: localeProp,
  className = "",
  onAuditUpdated,
}: ProjectAuditBadgeProps) {
  const hookLocale = useLocale();
  const activeLocale = localeProp || hookLocale || "en";
  const isFa = activeLocale === "fa";

  const [score, setScore] = useState<number | null>(
    typeof project.auditScore === "number" ? project.auditScore : null
  );
  const [breakdown, setBreakdown] = useState<ProjectAuditBreakdown | null>(
    project.auditBreakdown || null
  );
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Sync state if project props are loaded/updated asynchronously
  React.useEffect(() => {
    if (typeof project.auditScore === "number") {
      setScore(project.auditScore);
    } else if (project.auditScore === null) {
      setScore(null);
    }
    if (project.auditBreakdown) {
      setBreakdown(project.auditBreakdown);
    }
  }, [project.auditScore, project.auditBreakdown]);

  // 1. PUBLIC VISIBILITY RULE:
  // If not in admin mode and project has no score, hide completely from public visitors
  if (!isAdmin && (score === null || score === undefined)) {
    return null;
  }

  const handleRecalculate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAdmin || isRecalculating) return;

    setIsRecalculating(true);
    try {
      const targetId = project.id || project.slug;
      if (!targetId) return;
      const res = await fetch(`/api/admin/projects/${encodeURIComponent(targetId)}/audit`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.data?.report) {
        setScore(data.data.report.score);
        setBreakdown(data.data.report);
        onAuditUpdated?.(data.data.report);
      }
    } catch (err) {
      console.error("[ProjectAuditBadge] Recalculation failed:", err);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Compute color scheme based on score
  let badgeStyle = "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500";
  let dotStyle = "bg-zinc-500";

  if (score !== null) {
    if (score >= 90) {
      badgeStyle =
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20";
      dotStyle = "bg-emerald-500";
    } else if (score >= 70) {
      badgeStyle =
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20";
      dotStyle = "bg-amber-500";
    } else {
      badgeStyle =
        "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20";
      dotStyle = "bg-rose-500";
    }
  }

  // Active strengths and weaknesses with language resolution
  const activeStrengths =
    isFa && breakdown?.strengthsFa && breakdown.strengthsFa.length > 0
      ? breakdown.strengthsFa
      : breakdown?.strengths || [];

  const activeWeaknesses =
    isFa && breakdown?.weaknessesFa && breakdown.weaknessesFa.length > 0
      ? breakdown.weaknessesFa
      : breakdown?.weaknesses || [];

  // Tooltip content
  const tooltipContent = (
    <div
      dir={isFa ? "rtl" : "ltr"}
      className={`max-w-xs space-y-2.5 p-1 ${isFa ? "text-right font-sans" : "text-left"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
          <ShieldCheck className="size-3.5 text-primary shrink-0" />
          <span>
            {score !== null
              ? isFa
                ? `امتیاز ممیزی: ${toPersianDigits(score)} از ۱۰۰`
                : `Auditor Score: ${score} out of 100`
              : isFa
              ? "امتیاز ممیزی: هنوز ارزیابی نشده است"
              : "Audit Score: Not Audited Yet"}
          </span>
        </div>

        {score !== null && (
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
            {score >= 90
              ? isFa
                ? "عالی"
                : "Excellent"
              : score >= 70
              ? isFa
                ? "مطلوب"
                : "Healthy"
              : isFa
              ? "نیازمند بازبینی"
              : "Needs Review"}
          </span>
        )}
      </div>

      {/* Sub-breakdown percentages */}
      {breakdown?.breakdown && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono text-muted-foreground bg-muted/30 p-1.5 rounded">
          <div>
            {isFa ? "زبان‌ها:" : "Languages:"}{" "}
            <span className="text-foreground font-semibold">
              {isFa ? `${toPersianDigits(breakdown.breakdown.languages)}٪` : `${breakdown.breakdown.languages}%`}
            </span>
          </div>
          <div>
            {isFa ? "ذخیره‌سازی:" : "Storage:"}{" "}
            <span className="text-foreground font-semibold">
              {isFa ? `${toPersianDigits(breakdown.breakdown.assets)}٪` : `${breakdown.breakdown.assets}%`}
            </span>
          </div>
          <div>
            {isFa ? "معماری / دوزبانه:" : "Arch / I18n:"}{" "}
            <span className="text-foreground font-semibold">
              {isFa ? `${toPersianDigits(breakdown.breakdown.architecture)}٪` : `${breakdown.breakdown.architecture}%`}
            </span>
          </div>
          <div>
            {isFa ? "دیکشنری:" : "Taxonomy:"}{" "}
            <span className="text-foreground font-semibold">
              {isFa ? `${toPersianDigits(breakdown.breakdown.technologies)}٪` : `${breakdown.breakdown.technologies}%`}
            </span>
          </div>
        </div>
      )}

      {/* Uncalculated fallback note */}
      {score === null && (
        <p className="text-xs text-muted-foreground italic leading-relaxed">
          {isFa
            ? "هنوز تحلیلی ثبت نشده است. برای اجرای اولین ارزیابی کلیک کنید."
            : "No audit analysis available. Click to run initial evaluation."}
        </p>
      )}

      {/* Strengths */}
      {activeStrengths.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
            {isFa ? "نقاط قوت" : "Strengths"}
          </span>
          <ul className="space-y-1">
            {activeStrengths.map((s, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-tight text-foreground/90">
                <CheckCircle2 className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses / Gaps */}
      {activeWeaknesses.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
            {isFa ? "کمبودها و پیشنهادات" : "Gaps & Recommendations"}
          </span>
          <ul className="space-y-1">
            {activeWeaknesses.map((w, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-tight text-muted-foreground">
                <AlertCircle className="size-3 text-amber-500 shrink-0 mt-0.5" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Admin Action Hint */}
      {isAdmin && (
        <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-between gap-2 font-medium">
          {score !== null ? (
            <>
              <span className="text-foreground/90">
                {isFa
                  ? "⚡ جهت محاسبه مجدد و به‌روزرسانی امتیاز کلیک کنید"
                  : "⚡ Click to recalculate and refresh audit score"}
              </span>
              <RefreshCw className="size-2.5 text-primary shrink-0" />
            </>
          ) : (
            <>
              <span className="text-foreground/90">
                {isFa
                  ? "▶ جهت محاسبه مجدد و اجرای اولین ارزیابی کلیک کنید"
                  : "▶ Click to recalculate and run initial audit"}
              </span>
              <Play className="size-2.5 text-primary shrink-0" />
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <CustomTooltip content={tooltipContent} side="top" align="center">
      <button
        type="button"
        data-testid="audit-badge"
        onClick={isAdmin ? handleRecalculate : undefined}
        disabled={isRecalculating}
        aria-label={`Project audit score: ${score !== null ? `${score}/100` : "Pending"}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border transition-all duration-200 select-none ${badgeStyle} ${
          isAdmin
            ? "cursor-pointer hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            : "cursor-default"
        } ${className}`}
      >
        {isRecalculating ? (
          <Loader2 className="size-3 animate-spin text-primary" />
        ) : (
          <span className={`size-1.5 rounded-full ${dotStyle}`} />
        )}
        <span>
          {isRecalculating
            ? isFa
              ? "در حال ارزیابی..."
              : "Auditing..."
            : score !== null
            ? `${score}/100`
            : "--/100"}
        </span>
        {isAdmin && !isRecalculating && (
          <RefreshCw className="size-2.5 opacity-60 hover:opacity-100 transition-opacity" />
        )}
      </button>
    </CustomTooltip>
  );
}
