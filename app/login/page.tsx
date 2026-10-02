import { LoginForm } from "@/components/auth/LoginForm";
import { Mascot, type MascotVariant } from "@/components/brand/mascot";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const redirectParam = params.redirect;
  const redirectTo = typeof redirectParam === "string" ? redirectParam : null;

  // BORRADOR: quitar cuando el Director elija la mascota.
  // Vista previa para comparar las 3 propuestas en contexto: /login?mascota=1|2|3.
  const mascotParam = params.mascota;
  const variant: MascotVariant = mascotParam === "2" ? 2 : mascotParam === "3" ? 3 : 1;

  return <LoginForm redirectTo={redirectTo} mascot={<Mascot variant={variant} />} />;
}
