"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/landing/brand/Logo";

// Login de MenuSky: "la comanda del turno" (docs/design/login-direccion.md).
// Panel de marca con la mascota + ticket de comanda con el formulario.
// La lógica de handleSubmit es la de siempre; solo se suma estado de UI
// (mensaje de error persistente, reacción de la mascota, mostrar contraseña).
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
  const [showError, setShowError] = useState(false);
  const [failures, setFailures] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  const clearFailure = () => setShowError(false);
  const markFailure = () => {
    setShowError(true);
    setFailures((n) => n + 1);
    setShowPassword(false);
  };

  // Tras un error, el foco vuelve al botón "Entrar" (P-12). Corre después
  // del render en que el botón ya está habilitado.
  useEffect(() => {
    if (failures > 0) submitRef.current?.focus();
  }, [failures]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearFailure();
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setLoading(false);
      toast.error("Email o contraseña incorrectos");
      markFailure();
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

  // Dos nombres de animación alternados para que la sacudida se repita en
  // cada error seguido.
  const mood = loading
    ? "loading"
    : showError
      ? failures % 2 === 0
        ? "error-b"
        : "error-a"
      : "idle";

  return (
    <main className="lg">
      <header className="lg-top">
        {/* P-9 (a confirmar): el logo vuelve a la landing. Sin prefetch: no se
            descarga la landing (JS, CSS, 3D) mientras alguien solo quiere entrar. */}
        <Link href="/" prefetch={false} className="lg-home" aria-label="MenuSky, ir al inicio">
          <Logo size={36} />
        </Link>
      </header>

      <div className="lg-brand">
        <p className="lg-brand__claim">Cocina, salón y administración, en un solo lugar.</p>
        {mascot ? (
          <div className="lg-stage" aria-hidden="true">
            <div className="lg-mascot" data-mood={mood}>
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

        <form onSubmit={handleSubmit} className="lg-form">
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
              {/* P-8 (a confirmar): mostrar contraseña. */}
              <button
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

          {/* P-5: el error queda escrito (el toast se va solo). La región existe
              siempre para que el lector de pantalla anuncie el cambio. */}
          <div role="alert" className="lg-alert">
            {showError ? (
              <>
                <CircleAlert aria-hidden="true" focusable="false" className="lg-alert__icon" />
                <span>Email o contraseña incorrectos</span>
              </>
            ) : null}
          </div>

          <button ref={submitRef} type="submit" disabled={loading} className="lg-submit">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
