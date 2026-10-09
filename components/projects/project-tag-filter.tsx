"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type TagFilterItem = {
  name: string;
  count: number;
  description?: string;
};

interface ProjectTagFilterProps {
  activeTechnologies: string[];
  availableTechnologies: TagFilterItem[];
  totalMatchingProjects: number;
  onTechnologiesChange?: (next: string[]) => void;
  translations: {
    title: string;
    addFilter: string;
    clearAll: string;
    active: string;
    searchPlaceholder: string;
    noRemaining: string;
    noResults: string;
    availableCount: string;
    matches: string;
  };
}

export default function ProjectTagFilter({
  activeTechnologies,
  availableTechnologies,
  totalMatchingProjects,
  onTechnologiesChange,
  translations,
}: ProjectTagFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
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

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const updateFilters = (nextTechnologies: string[]) => {
    if (onTechnologiesChange) {
      onTechnologiesChange(nextTechnologies);
      return;
    }

    const params = new URLSearchParams();
    for (const tech of nextTechnologies) {
      params.append("tech", tech);
    }

    const queryStr = params.toString();
    const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;

    startTransition(() => {
      router.push(targetUrl, { scroll: false });
    });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const next = activeTechnologies.filter((t) => t !== tagToRemove);
    updateFilters(next);
  };

  const handleAddTag = (tagToAdd: string) => {
    if (activeTechnologies.includes(tagToAdd)) return;
    const next = [...activeTechnologies, tagToAdd];
    updateFilters(next);
  };

  const handleClearAll = () => {
    updateFilters([]);
    setIsOpen(false);
  };

  const hasActiveTags = activeTechnologies.length > 0;

  return (
    <div className="relative mb-10">
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* 1. Filter Trigger Icon Button */}
        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            title={translations.title}
            aria-label={translations.title}
            className={cn(
              "relative flex size-9 sm:size-10 cursor-pointer items-center justify-center rounded-full transition-all duration-200 shadow-xs group",
              isOpen
                ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/25"
                : hasActiveTags
                  ? "bg-primary/15 text-primary hover:bg-primary/25"
                  : "bg-muted/80 text-foreground hover:bg-muted hover:text-primary",
            )}
          >
            <SlidersHorizontal className="size-4 transition-transform duration-200 group-hover:scale-110" />

            {/* Badge indicating available candidate tags count */}
            {availableTechnologies.length > 0 && !hasActiveTags && (
              <span className="absolute -top-1 -right-1 flex min-w-4.5 h-4.5 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-mono font-bold leading-none text-primary-foreground shadow-xs">
                <span className="inline-flex items-center justify-center leading-none -translate-y-px">
                  {availableTechnologies.length}
                </span>
              </span>
            )}
          </button>

          {/* 2. Popover List for Available Remaining Tags (NO SEARCH BOX) */}
          {isOpen && (
            <div
              ref={popoverRef}
              role="dialog"
              aria-label={translations.title}
              className="absolute left-0 rtl:left-auto rtl:right-0 top-full z-50 mt-2 w-68 sm:w-76 max-w-[calc(100vw-2rem)] rounded-2xl border border-border/80 bg-popover/95 p-1.5 text-popover-foreground shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden"
            >
              {/* Header with title and close button */}
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/50 mb-1">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {translations.title}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground leading-none">
                    {availableTechnologies.length} {translations.availableCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="cursor-pointer p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center"
                    aria-label="Close"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable list of available candidate tags */}
              <div className="max-h-64 overflow-y-auto space-y-0.5 p-0.5 overscroll-contain">
                {availableTechnologies.length > 0 ? (
                  availableTechnologies.map((tech) => (
                    <button
                      key={tech.name}
                      type="button"
                      onClick={() => handleAddTag(tech.name)}
                      className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-left rtl:text-right text-xs sm:text-sm transition-colors duration-150 hover:bg-accent/80 hover:text-accent-foreground"
                    >
                      <div className="min-w-0 flex-1 overflow-hidden flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                          <span className="size-1.5 shrink-0 rounded-full bg-primary/60 transition-colors group-hover:bg-primary" />
                          <span className="font-medium truncate text-foreground group-hover:text-accent-foreground leading-snug">
                            {tech.name}
                          </span>
                        </div>
                        {tech.description && (
                          <div className="marquee-container mt-0.5">
                            <div className="marquee-track text-[11px] leading-normal text-muted-foreground group-hover:text-foreground">
                              <span>{tech.description}</span>
                              <span className="marquee-clone">&nbsp;&nbsp;•&nbsp;&nbsp;{tech.description}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Centered number in a borderless circle */}
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-mono font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground leading-none text-center select-none">
                        <span className="inline-flex items-center justify-center leading-none -translate-y-px">
                          {tech.count}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground/80 leading-snug">
                      {translations.noRemaining}
                    </p>
                    <p className="text-[11px] leading-snug">
                      Remove an active tag to view other technologies.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. Current Active Tags (alongside the icon button) */}
        {activeTechnologies.map((tech) => (
          <div
            key={tech}
            className="group inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-full bg-primary/10 ps-3.5 pe-1.5 text-xs sm:text-sm font-medium text-primary shadow-xs transition-all duration-200 hover:bg-primary/15"
          >
            <span className="leading-none flex items-center justify-center">
              {tech}
            </span>
            <button
              type="button"
              onClick={() => handleRemoveTag(tech)}
              disabled={isPending}
              aria-label={`Remove ${tech} filter`}
              title={`Remove ${tech}`}
              className="flex size-5 sm:size-6 cursor-pointer items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/20 hover:text-destructive active:scale-90"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {/* 4. Clear All Icon Button with Close (X) Icon */}
        {hasActiveTags && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={isPending}
            title={translations.clearAll}
            aria-label={translations.clearAll}
            className="flex size-9 sm:size-10 cursor-pointer items-center justify-center rounded-full bg-destructive/10 text-destructive transition-all duration-200 hover:bg-destructive/20 active:scale-95 shadow-xs"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
