import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/components/staff/currentStaff";
import { NoStaffAccess } from "@/components/staff/NoStaffAccess";

// R-2 / CA-2.6 (SEC-CS-01): la decisión de rol va en el layout, que NO queda
// envuelto por el Suspense de loading.tsx. Así redirect() responde 307 antes
// de que empiece el streaming, sin mandar el esqueleto del otro panel.
export default async function FloorLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff) return <NoStaffAccess />;
  // R-2: cocina va a su panel; admin y mozo ven este (sin bucles).
  if (staff.role === "kitchen") redirect("/kitchen");
  return children;
}
