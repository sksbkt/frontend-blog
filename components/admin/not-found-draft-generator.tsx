"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, RefreshCw, ArrowLeft, AlertCircle } from "lucide-react";

interface NotFoundDraftGeneratorProps {
  identifier: string;
  locale: string;
  githubUsername?: string;
}

export function NotFoundDraftGenerator({
  identifier,
  locale,
  githubUsername,
}: NotFoundDraftGeneratorProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If identifier is just repo name (e.g. "genshin-top-up") and we have username, construct fullName
  const candidateFullName = identifier.includes("/")
    ? identifier
    : githubUsername
    ? `${githubUsername}/${identifier}`
    : null;

  const handleGenerate = async () => {
    if (!candidateFullName) {
      setError("Unable to resolve repository full name (owner/repo).");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/projects/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: candidateFullName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to generate project draft.");
      }

      const targetId = data.draftId || data.project?._id || data.project?.slug?.current || identifier;
      router.push(`/${locale}/admin/projects/${encodeURIComponent(targetId)}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error generating draft.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 sm:p-10 rounded-2xl border border-border bg-card shadow-xs text-center space-y-6 max-w-xl mx-auto">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-xs">
        <AlertCircle className="w-7 h-7" />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Project Not Yet in Sanity CMS
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span dir="ltr" className="font-mono text-foreground font-semibold">"{identifier}"</span> is a raw GitHub repository that hasn't been imported or generated as a portfolio project yet.
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {candidateFullName && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating AI Draft...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate AI Draft Now</span>
              </>
            )}
          </button>
        )}

        <Link
          href={`/${locale}/admin?view=grid`}
          className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold border border-border bg-card text-foreground hover:bg-muted/60 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>Return to Projects Grid</span>
        </Link>
      </div>
    </div>
  );
}
