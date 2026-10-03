import { Bricolage_Grotesque } from "next/font/google";
import "./landing.css";

// Fuente display de la landing (docs/design/direccion-de-arte.md, 3):
// un único archivo variable, subset latin, ejes wght + opsz. Solo se
// carga en esta ruta; el resto de la app sigue con Geist.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-ms-display",
  display: "swap",
});

export default function LandingLayout({ children }: LayoutProps<"/">) {
  return <div className={`ms-landing ${display.variable}`}>{children}</div>;
}
