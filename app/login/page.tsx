import { LoginForm } from "@/components/auth/LoginForm";
import { Mascot } from "@/components/brand/mascot";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const redirectParam = params.redirect;
  const redirectTo = typeof redirectParam === "string" ? redirectParam : null;

  return <LoginForm redirectTo={redirectTo} mascot={<Mascot />} />;
}
