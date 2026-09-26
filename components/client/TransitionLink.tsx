"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { withViewTransition } from "@/lib/navigation/viewTransition";

// Como <Link>, pero envuelve la navegación en una View Transition — usarlo
// en los puntos de navegación entre la carta y "Tu pedido" (ver
// app/globals.css para la animación en sí, ::view-transition-old/new).
export function TransitionLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        withViewTransition(() => router.push(href.toString()));
      }}
      {...props}
    />
  );
}
