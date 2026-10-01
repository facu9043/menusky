"use client";

import { useEffect, useRef, useState } from "react";
import { ChefHat, Pause, Play, Send } from "lucide-react";
import { Phone } from "./mockups/Phone";
import { FakeQr, KitchenCard, StatusTracker } from "./mockups/Pieces";

// Secuencia del flujo (spec CA-4.2): el pedido sale del celular, aparece
// en cocina y el cliente ve pasar los estados con los nombres del código.
// 0 escanea, 1 arma el pedido, 2 envía (ticket volando), 3 Recibido,
// 4 En preparación, 5 Listo, 6 Entregado.
const DURATIONS = [2000, 2600, 1500, 2000, 2300, 1900, 2700];
const STATIC_STEP = 4; // estado fijo legible: sin JS o con reduced-motion
const TRACKER_FOR_STEP = [-1, -1, 0, 0, 1, 2, 3];
const PASO_FOR_STEP = [0, 1, 2, 2, 2, 2, 2];

const PASOS = [
  {
    title: "Escanean el QR de su mesa",
    text: "Cada mesa tiene su propio QR. La carta se abre en el navegador del celular.",
  },
  {
    title: "Eligen sus platos, con opciones y extras",
    text: "Punto de cocción, guarnición, extras y una nota para la cocina si hace falta.",
  },
  {
    title: "Cocina recibe el pedido y ellos lo siguen en vivo",
    text: "El pedido aparece en el panel de cocina y el cliente ve cómo avanza: Recibido, En preparación, Listo, Entregado.",
  },
];

export function FlowDemo() {
  const [step, setStep] = useState(STATIC_STEP);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<HTMLSpanElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // Arranca la secuencia la primera vez que entra en pantalla y la pausa
  // cuando sale (no consume CPU fuera de vista). Sin reduced-motion.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          setStep(0);
        }
        setRunning(entry.isIntersecting);
      },
      { threshold: 0.35 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running || paused) return;
    const id = window.setTimeout(() => setStep((s) => (s + 1) % DURATIONS.length), DURATIONS[step]);
    return () => window.clearTimeout(id);
  }, [running, paused, step]);

  // Trayectoria del ticket: del botón "Enviar" del celular al hueco de la
  // tarjeta nueva en cocina (sirve para el layout horizontal y el apilado).
  useEffect(() => {
    const stage = stageRef.current;
    const from = sendRef.current;
    const to = slotRef.current;
    if (!stage || !from || !to) return;
    const measure = () => {
      const s = stage.getBoundingClientRect();
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      stage.style.setProperty("--from-x", `${a.left + a.width / 2 - s.left}px`);
      stage.style.setProperty("--from-y", `${a.top + a.height / 2 - s.top}px`);
      stage.style.setProperty("--fly-x", `${b.left + b.width / 2 - (a.left + a.width / 2)}px`);
      stage.style.setProperty("--fly-y", `${b.top + 24 - (a.top + a.height / 2)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const tracker = TRACKER_FOR_STEP[step];
  const paso = PASO_FOR_STEP[step];
  const screen = step === 0 ? "scan" : step === 1 ? "cart" : "track";

  return (
    <div ref={rootRef} className="ms-flow" data-step={step} data-paused={paused || undefined}>
      <ol className="ms-flow__steps">
        {PASOS.map((p, i) => (
          <li key={p.title} className={`ms-flow__step ${i === paso ? "is-active" : ""}`} data-reveal>
            <span className="ms-flow__num" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <h3 className="ms-h3 ms-flow__title">{p.title}</h3>
              <p className="ms-flow__text">{p.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="ms-flow__stagewrap" data-reveal>
        <div
          ref={stageRef}
          className="ms-flow__stage"
          role="img"
          aria-label="Animación: el pedido de la Mesa 4 sale del celular del cliente, llega al panel de cocina y el cliente ve los estados Recibido, En preparación, Listo y Entregado."
        >
          <Phone className="ms-flow__phone" label="">
            <div className={`ms-fscreen ms-fscreen--scan ${screen === "scan" ? "is-on" : ""}`}>
              <span className="ms-fscreen__scanhint">Apuntá al QR de la mesa</span>
              <span className="ms-fscreen__qrframe">
                <FakeQr className="ms-fscreen__qr" />
                <span className="ms-fscreen__scanline" />
              </span>
              <span className="ms-fscreen__chip">Mesa 4</span>
            </div>

            <div className={`ms-fscreen ms-fscreen--cart ${screen === "cart" ? "is-on" : ""}`}>
              <span className="ms-fscreen__title">Tu pedido</span>
              <ul className="ms-fscreen__lines">
                <li>
                  <span>1× Burger completa</span>
                  <span>$ 12.900</span>
                </li>
                <li className="ms-fscreen__sub">A punto · Papas fritas</li>
                <li>
                  <span>1× Napolitana</span>
                  <span>$ 13.800</span>
                </li>
              </ul>
              <span className="ms-fscreen__total">
                <span>Total</span>
                <span>$ 26.700</span>
              </span>
              <span ref={sendRef} className="ms-fscreen__send">
                <Send />
                {step === 2 ? "Enviando..." : "Enviar pedido a cocina"}
              </span>
            </div>

            <div className={`ms-fscreen ms-fscreen--track ${screen === "track" ? "is-on" : ""}`}>
              <span className="ms-fscreen__title">Tu pedido · Mesa 4</span>
              <StatusTracker current={tracker < 0 ? 0 : tracker} className="ms-fscreen__tracker" />
              <ul className="ms-fscreen__lines ms-fscreen__lines--muted">
                <li>1× Burger completa</li>
                <li>1× Napolitana</li>
              </ul>
            </div>
          </Phone>

          <span className="ms-flow__ticket" aria-hidden="true">
            <span>Mesa 4</span>
            <span>2 ítems</span>
          </span>

          <div className="ms-flow__kitchen">
            <div className="ms-board__bar">
              <span className="ms-board__name">
                <ChefHat aria-hidden="true" />
                Cocina
              </span>
              <span className="ms-live">
                <i />
                En vivo
              </span>
            </div>
            <div className="ms-flow__cards">
              <div ref={slotRef} className={`ms-flow__slot ${step >= 3 && step <= 4 ? "is-filled" : ""}`}>
                {step >= 3 && step <= 4 && (
                  <KitchenCard
                    table="Mesa 4"
                    time="21:06"
                    status={step === 3 ? "received" : "in_kitchen"}
                    isNew={step === 3}
                    items={[
                      { qty: 1, name: "Burger completa", options: "A punto · Papas fritas" },
                      { qty: 1, name: "Napolitana" },
                    ]}
                    className="ms-flow__newcard"
                  />
                )}
              </div>
              <KitchenCard
                table="Mesa 2"
                time="20:58"
                status="in_kitchen"
                items={[{ qty: 2, name: "Doble cheddar", note: "Una sin pepinos" }]}
                className="ms-flow__oldcard"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          className="ms-flow__pause"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          {paused ? "Reanudar animación" : "Pausar animación"}
        </button>
      </div>
    </div>
  );
}
