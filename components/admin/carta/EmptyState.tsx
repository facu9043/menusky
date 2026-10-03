import { BrandPomo } from "@/components/admin/carta/BrandPomo";

// Estado vacío / de error con Pomo (CA-11.1, CA-11.5).
export function EmptyState({
  text,
  sub,
  face,
  action,
  role,
}: {
  text: string;
  sub?: string;
  face?: "oops";
  action?: React.ReactNode;
  role?: "status" | "alert";
}) {
  return (
    <div className="adm-empty" role={role}>
      <BrandPomo face={face} />
      <p className="adm-empty__text">{text}</p>
      {sub ? <p className="adm-empty__sub">{sub}</p> : null}
      {action}
    </div>
  );
}
