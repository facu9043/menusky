// Esqueleto de Apariencia (CA-11.4): encabezado real, tarjetas de tema y la
// paleta con la forma final, sin spinner a pantalla completa.
export default function AdminAppearanceLoading() {
  return (
    <div className="adm-page" aria-busy="true">
      <p className="sr-only" role="status">
        Cargando el tema...
      </p>
      <header className="adm-home__head">
        <p className="adm-eyebrow">Apariencia</p>
        <p className="adm-h1" aria-hidden="true">
          Tu carta, a tu estilo
        </p>
      </header>
      <span className="adm-sk adm-look__intro-sk" aria-hidden="true" />
      <span className="adm-sk adm-home__h2-sk" aria-hidden="true" />
      <div className="adm-presets" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="adm-sk adm-preset__sk" />
        ))}
      </div>
      <span className="adm-sk adm-custom__sk" aria-hidden="true" />
    </div>
  );
}
