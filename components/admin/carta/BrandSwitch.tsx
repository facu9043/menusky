"use client";

// Interruptor estilo iOS (CA-6.6): <button role="switch"> con aria-checked.
// Un <button> ya responde a Espacio y Enter; el área táctil es de 60 x 44
// aunque el dibujo mida 52 x 32 (CA-13.5). El estado no depende solo del
// color: cambia la posición del botón y, afuera, el texto de estado.
export function BrandSwitch({
  checked,
  onToggle,
  label,
  labelledBy,
  disabled,
  id,
}: {
  checked: boolean;
  onToggle: () => void;
  /** Nombre accesible, p. ej. "Disponible: Milanesa". */
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      className="adm-switch"
      onClick={onToggle}
    >
      <span className="adm-switch__track" aria-hidden="true">
        <span className="adm-switch__on" />
        <span className="adm-switch__thumb" />
      </span>
    </button>
  );
}
