import Link from "next/link";
import { Mail, MessageCircle, QrCode } from "lucide-react";
import { Logo } from "./brand/Logo";
import { EMAIL_DEMO_URL, EMAIL_DISPLAY, EXTERNAL_LINK_PROPS, PHONE_DISPLAY, WHATSAPP_DEMO_URL } from "./contact";

export function Footer() {
  return (
    <footer className="ms-footer">
      <div className="ms-container ms-footer__grid">
        <div className="ms-footer__brand">
          <Logo size={38} className="ms-logo--on-dark" />
          <p>Carta digital y pedidos por QR para restaurantes, bares y cafés.</p>
        </div>

        <div className="ms-footer__col">
          <h2 className="ms-footer__title">Contacto</h2>
          <ul>
            <li>
              <a href={WHATSAPP_DEMO_URL} {...EXTERNAL_LINK_PROPS} className="ms-footer__link">
                <MessageCircle aria-hidden="true" />
                <span>
                  Pedí una demo
                  <span className="ms-footer__small">WhatsApp {PHONE_DISPLAY}</span>
                </span>
                <span className="ms-sr-only"> (abre WhatsApp en una pestaña nueva)</span>
              </a>
            </li>
            <li>
              <a href={EMAIL_DEMO_URL} className="ms-footer__link">
                <Mail aria-hidden="true" />
                <span>
                  Escribinos por email
                  <span className="ms-footer__small">{EMAIL_DISPLAY}</span>
                </span>
              </a>
            </li>
          </ul>
        </div>

        <div className="ms-footer__col">
          <h2 className="ms-footer__title">Equipo</h2>
          <ul>
            <li>
              <Link href="/login" className="ms-footer__link ms-footer__link--plain">
                Ingresar
              </Link>
            </li>
          </ul>
        </div>

        <p className="ms-footer__diner">
          <QrCode aria-hidden="true" />
          ¿Sos cliente? Escaneá el QR de tu mesa
        </p>
      </div>
      <div className="ms-container ms-footer__legal">
        <p>© {new Date().getFullYear()} MenuSky</p>
      </div>
    </footer>
  );
}
