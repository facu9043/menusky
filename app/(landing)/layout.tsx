import { brandDisplay } from "@/components/brand/fonts";
import "../brand.css";
import "./landing.css";

// Marca común (tokens y fuente display) + estilos propios de la landing.
export default function LandingLayout({ children }: LayoutProps<"/">) {
  return <div className={`ms-brand ms-landing ${brandDisplay.variable}`}>{children}</div>;
}
