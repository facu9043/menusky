// Error de lectura de datos del admin (CA-11.5). El mensaje es genérico a
// propósito: nunca lleva el detalle de la base (RNF-S3). El detalle técnico
// (solo código y recurso, sin datos) queda en el log del servidor.
export class AdminDataError extends Error {
  readonly resource: string;

  constructor(resource: string, dbCode?: string | null) {
    super("No se pudieron cargar los datos. Probá de nuevo.");
    this.name = "AdminDataError";
    this.resource = resource;
    console.error(`[admin] lectura fallida: ${resource}${dbCode ? ` (${dbCode})` : ""}`);
  }
}

/** Lanza AdminDataError si la respuesta de Supabase trae error. */
export function assertNoDbError(
  error: { code?: string } | null | undefined,
  resource: string
): void {
  if (error) throw new AdminDataError(resource, error.code);
}
