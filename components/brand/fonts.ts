import { Bricolage_Grotesque } from "next/font/google";

// Fuente display de MenuSky (docs/design/direccion-de-arte.md, 3). ÚNICA
// declaración de Bricolage Grotesque del proyecto (docs/STACK.md, "Marca
// unificada"): un archivo variable, subset latin, ejes wght + opsz. Los
// layouts de marca (landing, login, admin) ponen brandDisplay.variable en su
// contenedor; app/brand.css la usa en --ms-font-display. El resto de la app
// sigue con Geist.
export const brandDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-ms-display",
  display: "swap",
});
