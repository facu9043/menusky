"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Foto con efecto "shimmer" mientras carga (típico de apps de delivery) en
// vez de un cuadro gris fijo. Una vez que la imagen carga, se desvanece el
// shimmer y aparece la foto con un fundido corto.
export function LazyImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {!loaded && (
        <div className="absolute inset-0 -translate-x-full animate-[shimmer-sweep_1.4s_ease-in-out_infinite] bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.5)_50%,transparent_80%)] motion-reduce:hidden" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
