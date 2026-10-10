import { Mascot } from "@/components/brand/mascot";

// Pomo estático para estados vacíos, errores y confirmaciones del admin
// (CA-11.1 a CA-11.3). Decorativo: el SVG ya trae aria-hidden.
export function BrandPomo({ face, size = "m" }: { face?: "oops"; size?: "m" | "s" }) {
  return (
    <div className={size === "s" ? "adm-pomo adm-pomo--s" : "adm-pomo"} data-face={face} aria-hidden="true">
      <Mascot />
    </div>
  );
}
