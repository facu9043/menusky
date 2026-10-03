// Esqueleto de la Carta (CA-11.4): la misma forma que el contenido real
// (encabezado, 3 datos rápidos, píldoras, platos), sin spinner a pantalla
// completa. El encabezado es real porque no depende de datos.
export default function AdminMenuLoading() {
  return (
    <div className="adm-page" aria-busy="true">
      <p className="sr-only" role="status">
        Cargando la carta...
      </p>
      <header className="adm-carta__head">
        <div>
          <p className="adm-eyebrow">Carta</p>
          <p className="adm-h1" aria-hidden="true">
            Tu carta, al día
          </p>
        </div>
      </header>
      <div className="adm-stats" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="adm-sk" style={{ height: 82, borderRadius: 14 }} />
        ))}
      </div>
      <div className="adm-pills" aria-hidden="true">
        {[92, 140, 118, 104].map((w, i) => (
          <span key={i} className="adm-sk" style={{ width: w, height: 44, borderRadius: 999, flex: "none" }} />
        ))}
      </div>
      <span className="adm-sk" aria-hidden="true" style={{ height: 46, maxWidth: 460, margin: "0.25rem 0 1rem" }} />
      <span className="adm-sk" aria-hidden="true" style={{ height: 24, width: 180, margin: "1.25rem 0 0.75rem" }} />
      <div className="adm-dishes" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="adm-sk" style={{ height: 76, borderRadius: 14 }} />
        ))}
      </div>
    </div>
  );
}
