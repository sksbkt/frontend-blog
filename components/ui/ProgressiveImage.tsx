"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";

export interface ProgressiveImageProps extends Omit<ImageProps, "src"> {
  src: string;
  lowResSrc?: string | null;
  alt: string;
  containerClassName?: string;
}

export default function ProgressiveImage({
  src,
  lowResSrc,
  alt,
  className = "",
  containerClassName = "",
  fill,
  width,
  height,
  priority,
  sizes,
  ...rest
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const isGif = src.toLowerCase().includes(".gif");

  // For animated GIFs: render directly without blur cross-fade
  if (isGif) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        unoptimized
        priority={priority}
        sizes={sizes}
        className={className}
        {...rest}
      />
    );
  }

  // If no lowResSrc is available, render standard Next.js image
  if (!lowResSrc) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className={className}
        {...rest}
      />
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${containerClassName}`}>
      {/* Low-Res Blurred Placeholder Backdrop */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
          isLoaded ? "opacity-0" : "opacity-100"
        }`}
      >
        <Image
          src={lowResSrc}
          alt=""
          aria-hidden="true"
          fill={fill}
          width={width}
          height={height}
          priority
          sizes="32px"
          className={`scale-110 object-cover ${className}`}
          style={{ filter: "blur(8px)", transform: "scale(1.1)" }}
        />
      </div>

      {/* High-Res Master Image */}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        onLoad={() => setIsLoaded(true)}
        className={`transition-opacity duration-500 ease-out ${
          isLoaded ? "opacity-100" : "opacity-0"
        } ${className}`}
        {...rest}
      />
    </div>
  );
}
