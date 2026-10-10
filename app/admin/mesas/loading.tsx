// Esqueleto de Mesas (CA-11.4): la misma forma que el contenido real
// (encabezado, píldoras, tarjetas), sin spinner a pantalla completa.
export default function AdminTablesLoading() {
  return (
    <div className="adm-page" aria-busy="true">
      <p className="sr-only" role="status">
        Cargando las mesas...
      </p>
      <header className="adm-mesas__head">
        <div>
          <p className="adm-eyebrow">Mesas</p>
          <p className="adm-h1" aria-hidden="true">
            Tu salón, de un vistazo
          </p>
        </div>
      </header>
      <div className="adm-pills" aria-hidden="true">
        {[92, 104, 124, 118].map((w, i) => (
          <span key={i} className="adm-sk" style={{ width: w, height: 44, borderRadius: 999, flex: "none" }} />
        ))}
      </div>
      <div className="adm-tables" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <span key={i} className="adm-sk adm-table__sk" />
        ))}
      </div>
    </div>
  );
}
