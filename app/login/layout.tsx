import type { Metadata } from "next";
import { brandDisplay } from "@/components/brand/fonts";
import "../brand.css";
import "./login.css";

// Con el template "%s | MenuSky" de app/layout.tsx queda "Ingresar | MenuSky".
export const metadata: Metadata = {
  title: "Ingresar",
};

// Marca común (tokens y fuente display) + estilos propios del login.
export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return <div className={`ms-brand ms-login ${brandDisplay.variable}`}>{children}</div>;
}
