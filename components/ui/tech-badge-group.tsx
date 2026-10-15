"use client";

import React, { useState, useRef } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Layers } from "lucide-react";
import { TechBadge } from "./tech-badge";

export interface TechBadgeGroupProps {
  technologies?: string[];
  limit?: number; // default: 3
  activeTechnologies?: string[];
  onTagClick?: (tech: string) => void;
  className?: string;
  badgeClassName?: string;
  size?: "sm" | "md";
}

export function TechBadgeGroup({
  technologies = [],
  limit = 3,
  activeTechnologies = [],
  onTagClick,
  className = "",
  badgeClassName = "",
  size = "sm",
}: TechBadgeGroupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter out empty or falsy strings
  const validTechs = React.useMemo(() => {
    return (technologies || []).filter(
      (tech): tech is string =>
        Boolean(tech && typeof tech === "string" && tech.trim())
    );
  }, [technologies]);

  if (validTechs.length === 0) {
    return null;
  }

  const visibleTechs = validTechs.slice(0, limit);
  const remainingTechs = validTechs.slice(limit);

  // Desktop hover interactions (mouseenter / mouseleave with delay)
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  return (
    <div
      dir="ltr"
      className={`inline-flex flex-wrap items-center gap-1.5 text-left ${className}`}
    >
      {/* =================================================================== */}
      {/* FIRST 3 VISIBLE TECH BADGES */}
      {/* =================================================================== */}
      {visibleTechs.map((tech) => (
        <TechBadge
          key={tech}
          name={tech}
          size={size}
          isActive={activeTechnologies.includes(tech)}
          onClick={onTagClick}
          className={badgeClassName}
        />
      ))}

      {/* =================================================================== */}
      {/* RESPONSIVE OVERFLOW "+N" TRIGGER (Hover on Desktop, Tap on Mobile) */}
      {/* =================================================================== */}
      {remainingTechs.length > 0 && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="inline-block"
        >
          <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen((prev) => !prev);
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-muted/90 hover:bg-muted text-muted-foreground hover:text-foreground border border-border shadow-2xs transition-all active:scale-95 cursor-pointer"
                title={`View ${remainingTechs.length} more technologies`}
                aria-label={`View ${remainingTechs.length} more technologies`}
              >
                <span>+{remainingTechs.length}</span>
              </button>
            </Popover.Trigger>

            <Popover.Portal>
              <Popover.Content
                side="top"
                align="start"
                sideOffset={8}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => e.stopPropagation()}
                className="z-50 w-72 p-3.5 rounded-2xl bg-popover text-popover-foreground border border-border shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
              >
                {/* Popover Header */}
                <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-border/60 text-xs font-semibold text-muted-foreground font-mono">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Stack Details</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {validTechs.length} technologies
                  </span>
                </div>

                {/* Grid of All Additional Technologies with brand icons & tooltips */}
                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {validTechs.map((tech) => (
                    <TechBadge
                      key={tech}
                      name={tech}
                      size="sm"
                      isActive={activeTechnologies.includes(tech)}
                      onClick={onTagClick}
                      className={badgeClassName}
                    />
                  ))}
                </div>

                <Popover.Arrow className="fill-border" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      )}
    </div>
  );
}
