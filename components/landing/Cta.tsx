import { Mail, MessageCircle } from "lucide-react";
import { EMAIL_DEMO_URL, EXTERNAL_LINK_PROPS, WHATSAPP_DEMO_URL } from "./contact";

type Size = "md" | "lg" | "sm";

/** Botón principal "Pedí una demo" (WhatsApp, pestaña nueva). */
export function DemoButton({
  size = "md",
  className,
  tone = "cheddar",
}: {
  size?: Size;
  className?: string;
  tone?: "cheddar" | "tomato";
}) {
  return (
    <a
      href={WHATSAPP_DEMO_URL}
      {...EXTERNAL_LINK_PROPS}
      className={`ms-btn ms-btn--${tone} ms-btn--${size} ${className ?? ""}`}
    >
      <MessageCircle aria-hidden="true" className="ms-btn__icon" />
      <span>Pedí una demo</span>
      <span className="ms-sr-only"> (abre WhatsApp en una pestaña nueva)</span>
    </a>
  );
}

/** Enlace secundario de email (CA-2.3). */
export function EmailLink({ className }: { className?: string }) {
  return (
    <a href={EMAIL_DEMO_URL} className={`ms-textlink ${className ?? ""}`}>
      <Mail aria-hidden="true" className="ms-textlink__icon" />
      <span>Escribinos por email</span>
    </a>
  );
}
