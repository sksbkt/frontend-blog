"use client";

import { useState, useCallback } from "react";
import { trackedFetch, type ToastNotifier } from "@/lib/hooks/use-telemetry-fetch";
import type { TechCheckResult } from "@/types/api";

export interface ResolvedTechItem {
  name: string;
  slug: string;
  summaryEn: string;
  summaryFa: string;
  icon?: string | null;
  category?: string | null;
}

export type TechResolutionStatus = "idle" | "checking_db" | "synthesizing_ai";

export function useResolvedTechs() {
  const [statusText, setStatusText] = useState<TechResolutionStatus>("idle");
  const [missingCount, setMissingCount] = useState<number>(0);

  const resolveTechs = useCallback(
    async (
      rawTechNames: string[],
      customToast?: ToastNotifier
    ): Promise<ResolvedTechItem[]> => {
      if (!rawTechNames || rawTechNames.length === 0) {
        return [];
      }

      // Step 1: Check cache
      setStatusText("checking_db");
      const checkRes = await trackedFetch<TechCheckResult>(
        "/api/admin/tech-definitions/check",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ techs: rawTechNames }),
        },
        customToast
      );

      let fullList: ResolvedTechItem[] = [...(checkRes.cached || [])];

      // Step 2: Synthesize only if there are missing items
      if (checkRes.missing && checkRes.missing.length > 0) {
        setMissingCount(checkRes.missing.length);
        setStatusText("synthesizing_ai");

        const synthRes = await trackedFetch<ResolvedTechItem[]>(
          "/api/admin/tech-definitions/synthesize",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ missing: checkRes.missing }),
          },
          customToast
        );
        fullList = [...fullList, ...(synthRes || [])];
      }

      setStatusText("idle");
      setMissingCount(0);
      return fullList;
    },
    []
  );

  return {
    statusText,
    missingCount,
    resolveTechs,
  };
}
