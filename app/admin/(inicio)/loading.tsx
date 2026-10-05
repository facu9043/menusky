// Esqueleto de Inicio (CA-9.7, CA-11.4): las cuatro tarjetas de datos y los
// cuatro accesos, con la forma final y sin spinner a pantalla completa.
// Vive en el grupo (inicio) para no envolver a las demás secciones.
export default function AdminHomeLoading() {
  return (
    <div className="adm-page" aria-busy="true">
      <p className="sr-only" role="status">
        Cargando el resumen...
      </p>
      <header className="adm-home__head">
        <p className="adm-eyebrow">Inicio</p>
        <p className="adm-h1" aria-hidden="true">
          Así viene el día
        </p>
        <span className="adm-sk adm-home__date-sk" aria-hidden="true" />
      </header>
      <div className="adm-kpis" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="adm-sk adm-kpi__sk" />
        ))}
      </div>
      <span className="adm-sk adm-home__h2-sk" aria-hidden="true" />
      <div className="adm-quick" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="adm-sk adm-tile__sk" />
        ))}
      </div>
    </div>
  );
}
