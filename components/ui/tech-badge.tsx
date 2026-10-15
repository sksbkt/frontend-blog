"use client";

import React, { useState, useEffect } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useLocale } from "next-intl";
import { getTechIcon } from "@/lib/tech/icons";
import {
  fetchTechDefinition,
  getCachedTechDefinition,
  type TechDefinitionData,
} from "@/lib/tech/service";

export interface TechBadgeProps {
  name: string;
  isActive?: boolean;
  onClick?: (name: string) => void;
  className?: string;
  size?: "sm" | "md";
  showTooltip?: boolean;
}

export function TechBadge({
  name,
  isActive = false,
  onClick,
  className = "",
  size = "sm",
  showTooltip = true,
}: TechBadgeProps) {
  const currentLocale = useLocale();
  const locale: "en" | "fa" = currentLocale === "fa" ? "fa" : "en";

  const [definition, setDefinition] = useState<TechDefinitionData | null>(() =>
    getCachedTechDefinition(name, locale)
  );
  const [isOpen, setIsOpen] = useState(false);

  // Lazy load definition when tooltip opens or if not yet in cache
  useEffect(() => {
    if (isOpen && !definition) {
      let isMounted = true;
      fetchTechDefinition(name, locale).then((data) => {
        if (isMounted && data) {
          setDefinition(data);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, definition, name, locale]);

  // Brand icon resolver
  const brandIcon = getTechIcon(name, "w-3 h-3 shrink-0");

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] gap-1.5"
      : "px-2.5 py-1 text-xs gap-2";

  const isClickable = Boolean(onClick);

  const badgeContent = (
    <span
      dir="ltr"
      onClick={(e) => {
        if (isClickable) {
          e.stopPropagation();
          onClick?.(name);
        }
      }}
      className={`inline-flex items-center font-mono font-medium rounded-md select-none transition-all duration-150 ${sizeClasses} ${
        isActive
          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70"
      } ${
        isClickable
          ? "cursor-pointer active:scale-95 hover:border-primary/40"
          : "cursor-default"
      } ${className}`}
    >
      {brandIcon}
      <span>{name}</span>
    </span>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  const summaryText =
    definition?.summary ||
    (locale === "fa" ? definition?.summary_fa : definition?.summary_en) ||
    "Loading technical summary...";

  return (
    <Tooltip.Root open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip.Trigger asChild>{badgeContent}</Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          align="center"
          sideOffset={6}
          className="z-50 max-w-xs p-3 rounded-xl bg-popover text-popover-foreground border border-border shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 text-start"
        >
          {/* Header: Brand Icon, Name & Category */}
          <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-border/60">
            <div dir="ltr" className="flex items-center gap-1.5">
              {brandIcon}
              <span className="font-bold text-xs font-mono text-foreground">
                {definition?.name || name}
              </span>
            </div>

            {definition?.category && (
              <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/50">
                {definition.category}
              </span>
            )}
          </div>

          {/* AI Cached Summary */}
          <p
            dir={locale === "fa" ? "rtl" : "ltr"}
            className="text-[11px] text-muted-foreground leading-relaxed"
          >
            {summaryText}
          </p>

          <Tooltip.Arrow className="fill-border" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
