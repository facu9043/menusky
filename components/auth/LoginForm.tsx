"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Basado en el template "Login Form Lamp" que pasó el usuario: se tira de la
// cadena de una lámpara para "encender la luz" y recién ahí aparece el
// formulario. Reimplementado sin GSAP/Draggable (esa librería requiere
// licencia paga para uso comercial) con eventos de puntero simples, y sin el
// sonido de clic del original (apuntaba a un asset de Codepen, no algo para
// depender en producción). Paleta recoloreada a tonos cálidos de cocina
// (naranja/rojo) en vez del dorado/neutro original.
const MAX_PULL = 60;
const PULL_THRESHOLD = MAX_PULL * 0.5;

export function LoginForm({ redirectTo }: { redirectTo: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [on, setOn] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<SVGCircleElement>) => {
    startY.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
    if (!dragging) return;
    setDragY(Math.max(0, Math.min(MAX_PULL, e.clientY - startY.current)));
  };

  const finishPull = () => {
    setDragging(false);
    if (dragY > PULL_THRESHOLD) setOn(true);
    setDragY(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<SVGCircleElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOn(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setLoading(false);
      toast.error("Email o contraseña incorrectos");
      return;
    }

    let destination = redirectTo;
    if (!destination) {
      const { data: staff } = await supabase
        .from("staff_users")
        .select("role")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();
      destination = staff?.role === "admin" ? "/admin" : "/kitchen";
    }

    setLoading(false);
    router.push(destination);
    router.refresh();
  };

  return (
    <div className="fixed inset-0 flex flex-wrap items-center justify-center gap-16 overflow-hidden bg-[#170f0c] p-8 transition-colors duration-500">
      {/* Resplandor ambiente cuando la luz está encendida */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: on ? 1 : 0,
          background:
            "radial-gradient(circle at 50% 40%, rgba(232,89,12,0.35), transparent 70%)",
        }}
      />

      {/* Lámpara */}
      <div className="relative z-10 flex h-[380px] w-[260px] justify-center">
        <svg viewBox="0 0 200 300" className="h-full w-full overflow-visible">
          <ellipse
            cx="100"
            cy="110"
            rx="60"
            ry="30"
            fill="#ff7a30"
            style={{
              filter: "blur(15px)",
              opacity: on ? 0.6 : 0,
              transition: "opacity 0.5s",
            }}
          />
          <rect x="92" y="100" width="16" height="160" rx="8" fill="#3a2a22" />
          <rect x="60" y="250" width="80" height="12" rx="6" fill="#3a2a22" />

          <line
            x1="130"
            y1="110"
            x2="130"
            y2={180 + dragY}
            stroke="#8a7568"
            strokeWidth="2"
            style={{ transition: dragging ? "none" : "y2 0.3s" }}
          />
          <circle
            cx="130"
            cy={190 + dragY}
            r="6"
            fill="#E8590C"
            style={{ transition: dragging ? "none" : "cy 0.3s" }}
          />
          <circle
            cx="130"
            cy={190 + dragY}
            r="25"
            fill="transparent"
            role="button"
            tabIndex={0}
            aria-label="Tirar de la cadena para encender la luz e ingresar"
            className="cursor-pointer outline-none focus-visible:fill-white/10"
            style={{ transition: dragging ? "none" : "cy 0.3s" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPull}
            onPointerCancel={finishPull}
            onKeyDown={handleKeyDown}
          />

          <path
            d="M30 110 C 30 50, 170 50, 170 110 C 170 125, 30 125, 30 110 Z"
            fill={on ? "#fff3e6" : "#efe6da"}
            style={{
              filter: on ? "drop-shadow(0 0 30px rgba(255,150,60,0.5))" : "none",
              transition: "fill 0.5s, filter 0.5s",
            }}
          />
        </svg>

        {!on && (
          <p className="absolute -bottom-2 text-center text-xs text-white/40 motion-safe:animate-pulse">
            Tirá de la cadena para ingresar
          </p>
        )}
      </div>

      {/* Formulario */}
      <div
        className={cn(
          "relative z-10 w-[340px] rounded-[30px] border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-xl transition-all duration-700",
          on
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-8 opacity-0"
        )}
      >
        <h2 className="mb-1 text-center text-xl font-semibold text-white">Ingresar</h2>
        <p className="mb-6 text-center text-sm text-white/50">
          Acceso para el equipo del restaurante
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1.5 ml-1 block text-xs text-white/60">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-transparent bg-white/[0.07] px-4 py-3.5 text-white outline-none transition focus:border-[#E8590C] focus:bg-white/[0.12]"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 ml-1 block text-xs text-white/60">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-transparent bg-white/[0.07] px-4 py-3.5 text-white outline-none transition focus:border-[#E8590C] focus:bg-white/[0.12]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-2xl bg-[linear-gradient(135deg,#E8590C,#FF8A3D,#B23A1E,#FF8A3D,#8C2E13)] py-4 font-semibold text-[#170f0c] transition hover:scale-[1.02] disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
