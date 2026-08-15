export const WAITER_CALL_REASON_LABELS: Record<string, string> = {
  cuenta: "Pide la cuenta",
  consulta: "Tiene una consulta",
  otro: "Llama al mozo",
};

export function waiterCallReasonLabel(reason: string | null): string {
  return WAITER_CALL_REASON_LABELS[reason ?? ""] ?? WAITER_CALL_REASON_LABELS.otro;
}
