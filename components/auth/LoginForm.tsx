"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAuthApiError } from "@supabase/supabase-js";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/landing/brand/Logo";
import { safeRedirect } from "./safeRedirect";

// Login de MenuSky: "la comanda del turno" (docs/design/login-direccion.md).
// Panel de marca con la mascota + ticket de comanda con el formulario.
// Lógica de autenticación de siempre (signInWithPassword, staff_users,
// admin -> /admin, resto -> /kitchen) con los únicos cambios autorizados por
// la spec v1.1: ?redirect= solo interno (CA-4.11), try/finally y error de
// red distinto del de credenciales (CA-4.16 a CA-4.19). El resto es estado
// de UI: mensaje en línea, mostrar contraseña y reacciones de la mascota.

const CREDENTIALS_MESSAGE = "Email o contraseña incorrectos";
const NETWORK_MESSAGE = "No pudimos conectar. Revisá tu conexión e intentá de nuevo.";

type Failure = "credentials" | "network";
type Look = "none" | "email" | "pass" | "btn";

// CA-4.18. Credenciales inválidas = AuthApiError con status 400
// (node_modules/@supabase/auth-js/src/lib/fetch.ts:145, code
// "invalid_credentials"). Todo lo demás es red/servicio: falla de red
// (AuthRetryableFetchError status 0, fetch.ts:81 y :235), 5xx
// (AuthRetryableFetchError, fetch.ts:88-97), 429 y otros 4xx (decisión del
// Líder: mismo mensaje de red) y errores sin status.
function failureOf(error: unknown): Failure {
  return isAuthApiError(error) && error.status === 400 ? "credentials" : "network";
}

// Hacia dónde mira la mascota según el elemento con foco (CA-10.7).
function lookAt(id: string): Look {
  if (id === "email") return "email";
  if (id === "password" || id === "lg-eye") return "pass";
  if (id === "lg-submit") return "btn";
  return "none";
}

// Red de seguridad tras un éxito (CA-10.10 d): si seguimos en /login a los
// 10 s, el botón vuelve a "Entrar". No anima ni demora la navegación.
const SUCCESS_SAFETY_MS = 10_000;

export function LoginForm({
  redirectTo,
  mascot,
}: {
  redirectTo: string | null;
  mascot?: React.ReactNode;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // Estado de UI (no toca la autenticación).
  const [failure, setFailure] = useState<Failure | null>(null);
  const [failures, setFailures] = useState(0);
  const [oops, setOops] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [look, setLook] = useState<Look>("none");
  const [showPassword, setShowPassword] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  const markFailure = (kind: Failure) => {
    setSucceeded(false);
    setFailure(kind);
    setOops(true);
    setFailures((n) => n + 1);
    setShowPassword(false);
  };

  // Tras un error, el foco vuelve al botón "Entrar" (P-12). Corre después
  // del render en que el botón ya está habilitado.
  useEffect(() => {
    if (failures > 0) submitRef.current?.focus();
  }, [failures]);

  useEffect(() => {
    if (!succeeded) return;
    const id = window.setTimeout(() => {
      setSucceeded(false);
      setLoading(false);
    }, SUCCESS_SAFETY_MS);
    return () => window.clearTimeout(id);
  }, [succeeded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFailure(null);
    setOops(false);
    let navigating = false;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        markFailure(error ? failureOf(error) : "credentials");
        return;
      }

      let destination = safeRedirect(redirectTo);
      if (!destination) {
        const { data: staff } = await supabase
          .from("staff_users")
          .select("role")
          .eq("auth_user_id", data.user.id)
          .maybeSingle();
        destination = staff?.role === "admin" ? "/admin" : "/kitchen";
      }

      // Éxito: la reacción de la mascota se fija en el mismo render que la
      // navegación, sin esperar a la animación (CA-10.10). El botón sigue en
      // "Entrando..." hasta que Next muestre el destino.
      setSucceeded(true);
      router.push(destination);
      router.refresh();
      navigating = true;
    } catch {
      markFailure("network");
    } finally {
      if (!navigating) setLoading(false);
    }
  };

  // Un cambio de mirada por evento de foco/desenfoque, nunca por tecla.
  const handleFocus = (e: React.FocusEvent<HTMLFormElement>) => {
    const id = e.target.id;
    if (id === "email" || id === "password") setOops(false);
    setLook(lookAt(id));
  };
  const handleBlur = (e: React.FocusEvent<HTMLFormElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setLook("none");
  };

  // Prioridad: éxito > "Entrando..." > error > mirada > idle (HU-10).
  // Dos nombres de error alternados para repetir la sacudida en cada error.
  const mood = succeeded
    ? "success"
    : loading
      ? "loading"
      : oops
        ? failures % 2 === 0
          ? "error-b"
          : "error-a"
        : "idle";
  const face = succeeded ? "yay" : oops ? "oops" : "ok";

  return (
    <main className="lg">
      <header className="lg-top">
        {/* El logo vuelve a la landing (HU-12). Sin prefetch: no se descarga
            la landing (JS, CSS, 3D) mientras alguien solo quiere entrar. */}
        <Link href="/" prefetch={false} className="lg-home" aria-label="MenuSky, ir al inicio">
          <Logo size={36} />
        </Link>
      </header>

      <div className="lg-brand">
        <p className="lg-brand__claim">Cocina, salón y administración, en un solo lugar.</p>
        {mascot ? (
          <div className="lg-stage" aria-hidden="true">
            <div className="lg-mascot" data-mood={mood} data-look={look} data-face={face}>
              {mascot}
            </div>
          </div>
        ) : null}
      </div>

      <section className="lg-ticket" aria-labelledby="lg-title">
        <h1 id="lg-title" className="lg-title">
          Ingresar
        </h1>
        <p className="lg-lead">Acceso para el equipo del restaurante</p>
        <div className="lg-perf" aria-hidden="true" />

        <form
          onSubmit={handleSubmit}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="lg-form"
        >
          <div className="lg-field">
            <label htmlFor="email" className="lg-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="lg-input"
            />
          </div>
          <div className="lg-field">
            <label htmlFor="password" className="lg-label">
              Contraseña
            </label>
            <div className="lg-pass">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="lg-input lg-input--pass"
              />
              {/* Mostrar contraseña (HU-11). */}
              <button
                id="lg-eye"
                type="button"
                className="lg-eye"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" focusable="false" />
                ) : (
                  <Eye aria-hidden="true" focusable="false" />
                )}
              </button>
            </div>
          </div>

          {/* Único canal del error (CA-6.6, CA-6.14): mensaje en línea y
              persistente, sin toast. La región existe siempre para que el
              lector de pantalla anuncie el cambio una sola vez. */}
          <div role="alert" className="lg-alert">
            {failure ? (
              <>
                <CircleAlert aria-hidden="true" focusable="false" className="lg-alert__icon" />
                <span>{failure === "credentials" ? CREDENTIALS_MESSAGE : NETWORK_MESSAGE}</span>
              </>
            ) : null}
          </div>

          <button
            id="lg-submit"
            ref={submitRef}
            type="submit"
            disabled={loading}
            className="lg-submit"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
