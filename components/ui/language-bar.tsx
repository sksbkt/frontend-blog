"use client";

import React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  computeLanguageBreakdown,
  getLanguageColor,
  type LanguageBreakdownItem,
  type ProjectLanguageItem,
} from "@/lib/github/languages";

export interface LanguageBarProps {
  languages?: ProjectLanguageItem[] | LanguageBreakdownItem[];
  rawLanguages?: Record<string, number> | string | null;
  breakdown?: LanguageBreakdownItem[];
  showLegend?: boolean;
  barHeight?: "sm" | "md" | "lg";
  className?: string;
  maxLegendItems?: number;
}

const BAR_HEIGHT_MAP: Record<"sm" | "md" | "lg", { className: string; minHeight: string }> = {
  sm: { className: "h-2", minHeight: "8px" },
  md: { className: "h-2.5", minHeight: "10px" },
  lg: { className: "h-3.5", minHeight: "14px" },
};

export function LanguageBar({
  languages,
  rawLanguages,
  breakdown: customBreakdown,
  showLegend = true,
  barHeight = "md",
  className = "",
  maxLegendItems = 6,
}: LanguageBarProps) {
  console.log("LanguageBar data:", languages);

  const items = React.useMemo<LanguageBreakdownItem[]>(() => {
    // 1. Direct formatted languages array from Sanity
    if (languages && Array.isArray(languages) && languages.length > 0) {
      return languages.map((lang) => {
        const color = lang.color || getLanguageColor(lang.name);
        const formatted =
          "formattedPercentage" in lang && lang.formattedPercentage
            ? lang.formattedPercentage
            : `${lang.percentage.toFixed(1)}%`;

        return {
          name: lang.name,
          bytes: lang.bytes || 0,
          percentage: lang.percentage,
          formattedPercentage: formatted,
          color,
        };
      });
    }

    // 2. Direct breakdown array
    if (customBreakdown && customBreakdown.length > 0) {
      return customBreakdown;
    }

    // 3. Raw byte counts calculation
    if (rawLanguages) {
      return computeLanguageBreakdown(rawLanguages);
    }

    return [];
  }, [languages, customBreakdown, rawLanguages]);

  if (!items || items.length === 0) {
    return null;
  }

  const heightConfig = BAR_HEIGHT_MAP[barHeight] || BAR_HEIGHT_MAP.md;
  const legendItems = items.slice(0, maxLegendItems);
  const remainingCount = items.length - maxLegendItems;

  return (
    <div dir="ltr" className={`w-full space-y-2 text-left select-none ${className}`}>
      {/* =================================================================== */}
      {/* UNIFIED MULTI-SEGMENT PROGRESS BAR WITH SINGLE ROOT TOOLTIP */}
      {/* =================================================================== */}
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            tabIndex={0}
            role="progressbar"
            aria-label={`Languages: ${items.map((i) => `${i.name} ${i.formattedPercentage}`).join(", ")}`}
            aria-valuenow={100}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ minHeight: heightConfig.minHeight }}
            className={`${heightConfig.className} w-full rounded-full overflow-hidden flex bg-muted/60 border border-border/40 shadow-2xs cursor-pointer focus:outline-none transition-all duration-200 hover:ring-2 hover:ring-primary/20 hover:scale-[1.01]`}
          >
            {items.map((item, idx) => (
              <div
                key={item.name}
                style={{
                  width: `${Math.max(item.percentage, 1)}%`,
                  backgroundColor: item.color,
                }}
                className={`h-full transition-all duration-200 hover:brightness-110 ${
                  idx > 0 ? "border-l border-background/25" : ""
                }`}
              />
            ))}
          </div>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="center"
            sideOffset={8}
            className="z-50 min-w-44 p-3 rounded-xl text-xs bg-popover text-popover-foreground border border-border/80 shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 select-none"
          >
            {/* Header: Languages */}
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border/60">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-mono">
                Languages
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {items.length} {items.length === 1 ? "lang" : "langs"}
              </span>
            </div>

            {/* Vertical list of detected languages */}
            <div className="space-y-1.5">
              {items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-4 py-0.5 text-xs font-mono"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs ring-1 ring-background/40"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-foreground truncate">
                      {item.name}
                    </span>
                  </div>

                  <span className="font-semibold text-muted-foreground shrink-0 text-right">
                    {item.formattedPercentage}
                  </span>
                </div>
              ))}
            </div>

            <Tooltip.Arrow className="fill-border" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      {/* =================================================================== */}
      {/* SUB-LEGEND WITH COLOR DOTS */}
      {/* =================================================================== */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs font-mono">
          {legendItems.map((item) => (
            <div
              key={item.name}
              className="inline-flex items-center gap-1.5 group cursor-default"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125 shadow-2xs"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[11px] font-medium text-foreground">
                {item.name}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">
                {item.formattedPercentage}
              </span>
            </div>
          ))}

          {remainingCount > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono">
              +{remainingCount} other{remainingCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
