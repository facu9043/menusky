"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { ThemePortalContext } from "@/lib/theme/ThemePortalContext";

// Ver lib/theme/ThemePortalContext.tsx: expone este div como destino del
// portal de los sheets, para que hereden el theme del restaurante en vez de
// caer en los valores default de :root.
export function ThemeRoot({
  className,
  style,
  dataThemeStyle,
  children,
}: {
  className: string;
  style: CSSProperties;
  dataThemeStyle: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} data-theme-style={dataThemeStyle} className={className} style={style}>
      <ThemePortalContext.Provider value={ref}>{children}</ThemePortalContext.Provider>
    </div>
  );
}
