"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";

interface ProductImageProps {
  src: string | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fit?: "contain" | "cover";
}

/**
 * next/image with a graceful placeholder for missing or broken images —
 * never a browser broken-image icon (edge case 20).
 */
export function ProductImage({ src, alt, sizes, priority, className, fit = "contain" }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !src || failedSrc === src;

  if (failed) {
    return (
      <div className={cn("flex size-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground", className)} role="img" aria-label={`${alt} (image unavailable)`}>
        <ImageOff className="size-6" aria-hidden />
        <span className="text-[11px]">Image unavailable</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={src.startsWith("/api/")}
      onError={() => setFailedSrc(src)}
      className={cn(fit === "contain" ? "object-contain" : "object-cover", className)}
    />
  );
}
