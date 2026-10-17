import { cache } from "react";
import { getStaffUser } from "@/lib/auth/getStaffUser";

// La misma lectura de getStaffUser, deduplicada por pedido: el layout de
// /kitchen y /floor decide el rol (SEC-CS-01) y la página reutiliza el
// resultado sin repetir la consulta.
export const getCurrentStaff = cache(getStaffUser);
