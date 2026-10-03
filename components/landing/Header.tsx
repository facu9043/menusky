import Link from "next/link";
import { Logo } from "./brand/Logo";
import { DemoButton } from "./Cta";
import { MobileMenu } from "./MobileMenu";

export const NAV_LINKS = [
  { href: "#funciones", label: "Funciones" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#preguntas", label: "Preguntas" },
] as const;

export function Header() {
  return (
    <header className="ms-header">
      <div className="ms-container ms-header__inner">
        <a href="#inicio" className="ms-header__brand" aria-label="MenuSky, ir al inicio">
          <Logo size={34} />
        </a>

        <nav className="ms-header__nav" aria-label="Secciones">
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="ms-navlink">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ms-header__actions">
          <Link href="/login" className="ms-navlink ms-header__login">
            Ingresar
          </Link>
          <DemoButton size="sm" className="ms-header__cta" />
          <MobileMenu links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
