import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/components/staff/currentStaff";
import { NoStaffAccess } from "@/components/staff/NoStaffAccess";

// R-2 / CA-2.6 (SEC-CS-01): la decisión de rol va en el layout, que NO queda
// envuelto por el Suspense de loading.tsx. Así redirect() responde 307 antes
// de que empiece el streaming, sin mandar el esqueleto del otro panel.
export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff) return <NoStaffAccess />;
  // R-2: el mozo va a su panel; admin y cocina ven este (sin bucles).
  if (staff.role === "waiter") redirect("/floor");
  return children;
}
