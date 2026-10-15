"use client";

import * as React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

export interface CustomTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  delayDuration?: number;
  className?: string;
  asChild?: boolean;
}

/**
 * Reusable Radix-backed custom tooltip component.
 * Uses the global root Tooltip.Provider so only one tooltip instance
 * is active at any time site-wide.
 */
export function CustomTooltip({
  content,
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
  delayDuration,
  className = "",
  asChild = true,
}: CustomTooltipProps) {
  if (!content) {
    return children;
  }

  return (
    <Tooltip.Root delayDuration={delayDuration}>
      <Tooltip.Trigger asChild={asChild}>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={`z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-popover text-popover-foreground border border-border/80 shadow-md backdrop-blur-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 select-none ${className}`}
        >
          {content}
          <Tooltip.Arrow className="fill-border" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * Global Tooltip Provider for root coordination.
 * Enforces a single active tooltip instance site-wide with tuned timing.
 */
export function GlobalTooltipProvider({
  children,
  delayDuration = 150,
  skipDelayDuration = 100,
}: {
  children: React.ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
}) {
  return (
    <Tooltip.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
    >
      {children}
    </Tooltip.Provider>
  );
}
