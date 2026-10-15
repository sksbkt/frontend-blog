"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { FolderGit2, Play, Image as ImageIcon } from "lucide-react";
import { urlFor } from "@/lib/sanity/client";

function resolveSanityUrl(src?: string): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) {
    return src;
  }
  if (src.startsWith("image-")) {
    try {
      return urlFor(src).url();
    } catch {
      const parts = src.split("-");
      if (parts.length >= 4) {
        const hash = parts[1];
        const dim = parts[2];
        const ext = parts[3];
        const pId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
        const dSet = process.env.NEXT_PUBLIC_SANITY_DATASET;
        if (pId && dSet) {
          return `https://cdn.sanity.io/images/${pId}/${dSet}/${hash}-${dim}.${ext}`;
        }
      }
    }
  }
  return undefined;
}

interface ProjectThumbnailProps {
  repoFullName?: string;
  repoName?: string;
  branch?: string;
  sanityCoverUrl?: string;
  sanityAssetId?: string;
  sanityGifUrl?: string;
  showGif?: boolean;
  alt?: string;
  aspectRatio?: string;
  className?: string;
  badge?: React.ReactNode;
}

export function ProjectThumbnail({
  repoFullName,
  repoName,
  branch = "main",
  sanityCoverUrl,
  sanityAssetId,
  sanityGifUrl,
  showGif = false,
  alt = "Project Preview",
  aspectRatio = "aspect-video",
  className = "",
  badge,
}: ProjectThumbnailProps) {
  // Build candidate URL waterfall
  const candidates = React.useMemo(() => {
    const list: string[] = [];

    // 1. Animated GIF if requested and present
    const resolvedGif = resolveSanityUrl(sanityGifUrl);
    if (showGif && resolvedGif) {
      list.push(resolvedGif);
    }

    // 2. Uploaded Sanity Cover Asset
    const resolvedCover = resolveSanityUrl(sanityCoverUrl) || resolveSanityUrl(sanityAssetId);
    if (resolvedCover) {
      list.push(resolvedCover);
    }

    // 3. Raw GitHub Asset (hero.png in repository assets/ folder)
    if (repoFullName) {
      list.push(
        `https://raw.githubusercontent.com/${repoFullName}/${encodeURIComponent(
          branch
        )}/assets/hero.png`
      );
    }

    // 4. GitHub OpenGraph Dynamic Banner
    if (repoFullName && repoFullName.includes("/")) {
      list.push(`https://opengraph.githubassets.com/1/${repoFullName.trim()}`);
    }

    return list;
  }, [repoFullName, branch, sanityCoverUrl, sanityGifUrl, showGif]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset when sources change
  useEffect(() => {
    setCurrentIndex(0);
    setHasError(candidates.length === 0);
    setIsLoading(candidates.length > 0);
  }, [candidates]);

  const handleImageError = () => {
    if (currentIndex + 1 < candidates.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsLoading(true);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const activeSrc = !hasError && candidates.length > 0 ? candidates[currentIndex] : null;

  // Extract clean display initials
  const displayName = repoName || repoFullName?.split("/")[1] || "Project";
  const initials = displayName
    .split(/[-_.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={`relative w-full ${aspectRatio} overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 select-none group ${className}`}
    >
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-200/70 dark:bg-neutral-800/70 animate-pulse z-10 flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-neutral-400 dark:text-neutral-600 animate-pulse" />
        </div>
      )}

      {/* Primary Image / Candidate */}
      {activeSrc ? (
        <Image
          src={activeSrc}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={`object-cover transition-all duration-300 ${
            isLoading ? "opacity-0 scale-98" : "opacity-100 scale-100"
          }`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          unoptimized
        />
      ) : (
        /* Final Elegant Blueprint / Gradient Fallback */
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-100 via-neutral-200/60 to-neutral-300/40 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 shadow-inner flex items-center justify-center mb-2">
            <FolderGit2 className="w-6 h-6 text-neutral-500 dark:text-neutral-400" />
          </div>

          <span
            dir="ltr"
            className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200 truncate max-w-[90%] text-center"
          >
            {displayName}
          </span>

          <span
            dir="ltr"
            className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 mt-0.5"
          >
            {initials ? `[ ${initials} ]` : "Repository Blueprint"}
          </span>
        </div>
      )}

      {/* Top / Bottom Badge Overlays */}
      {badge && <div className="absolute top-2.5 start-2.5 z-20">{badge}</div>}

      {showGif && sanityGifUrl && !hasError && (
        <div className="absolute bottom-2.5 start-2.5 z-20">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-600/90 text-white backdrop-blur-md shadow-xs">
            <Play className="w-2.5 h-2.5 fill-white" />
            <span>GIF Preview</span>
          </span>
        </div>
      )}
    </div>
  );
}
