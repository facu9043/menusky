import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/landing/brand/Logo";
import { LogoutButton } from "@/components/staff/LogoutButton";
import { StaffBrand } from "@/components/staff/StaffBrand";

// Pantalla sin permiso con la marca (CA-2.5, CA-8.8): logo e ícono, sin Pomo.
// No muestra datos del restaurante ni de la persona.
export function AccessDenied({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <StaffBrand>
      <main className="st-deny">
        <div className="st-deny__card">
          <Logo size={34} />
          <span className="st-deny__icon" aria-hidden="true">
            <Icon />
          </span>
          <h1 className="st-deny__title">{title}</h1>
          <p className="st-deny__text">{children}</p>
          <LogoutButton />
        </div>
      </main>
    </StaffBrand>
  );
}
