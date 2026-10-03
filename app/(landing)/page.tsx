import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Benefits } from "@/components/landing/Benefits";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { TeamPanels } from "@/components/landing/TeamPanels";
import { Customize } from "@/components/landing/Customize";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { Reveal } from "@/components/landing/Reveal";

// Título, descripción, Open Graph y Twitter vienen del layout raíz. Acá
// solo va la canónica de "/" (en el layout raíz haría que todas las rutas
// apunten a la home).
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return (
    <>
      <a href="#contenido" className="ms-skip">
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" tabIndex={-1}>
        <Hero />
        <Benefits />
        <HowItWorks />
        <Features />
        <TeamPanels />
        <Customize />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <Reveal />
    </>
  );
}
