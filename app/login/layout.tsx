import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./login.css";

// Misma fuente display que la landing (docs/STACK.md, "Arquitectura del
// rediseño del login"): un archivo variable, subset latin, eje opsz.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-ms-display",
  display: "swap",
});

// Con el template "%s | MenuSky" de app/layout.tsx queda "Ingresar | MenuSky".
export const metadata: Metadata = {
  title: "Ingresar",
};

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return <div className={`ms-login ${display.variable}`}>{children}</div>;
}
