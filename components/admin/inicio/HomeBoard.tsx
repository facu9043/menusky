"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ConciergeBell, LayoutGrid, Plus, Printer, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/admin/carta/EmptyState";
import { useAdminLive } from "@/lib/admin/live/AdminLiveProvider";

// Inicio (HU-9), idéntico a docs/design/admin/maquetas/inicio.html. Los tres
// primeros datos vienen de la instantánea en vivo (CA-9.4); "Platos sin
// stock" de la carta, leída en el servidor al entrar. Un dato que falló
// muestra "No pudimos cargar" con "Reintentar" y los demás siguen (CA-9.7).
export function HomeBoard({
  date,
  liveOk,
  outOfStock,
}: {
  date: string;
  liveOk: boolean;
  /** null = no se pudo leer la carta. */
  outOfStock: number | null;
}) {
  const router = useRouter();
  const live = useAdminLive();
  const [pending, startTransition] = useTransition();
  const [clicked, setClicked] = useState(false);
  const retrying = pending && clicked;

  const retry = () => {
    setClicked(true);
    void live.refresh();
    startTransition(() => router.refresh());
  };

  const failed = (label: string) => (
    <div className="adm-stat adm-kpi" role="alert">
      <span className="adm-stat__label">{label}</span>
      <span className="adm-kpi__err">
        No pudimos cargar
        <button
          type="button"
          className="adm-btn adm-btn--small"
          aria-label={`Reintentar ${label}`}
          disabled={retrying}
          onClick={retry}
        >
          <RotateCcw aria-hidden="true" />
          {retrying ? "Reintentando..." : "Reintentar"}
        </button>
      </span>
    </div>
  );

  const go = (text: string) => (
    <span className="adm-kpi__go">
      {text}
      <ArrowRight aria-hidden="true" />
    </span>
  );

  const noOrders = liveOk && live.ordersToday === 0;

  return (
    <div className="adm-page">
      <header className="adm-home__head">
        <p className="adm-eyebrow">Inicio</p>
        <h1 className="adm-h1">Así viene el día</h1>
        <p className="adm-home__date">{date}</p>
      </header>

      <section className="adm-kpis" aria-label="Resumen del día">
        {liveOk ? (
          <div className="adm-stat adm-kpi adm-stat--hot">
            <span className="adm-stat__label">Pedidos de hoy</span>
            <span className="adm-stat__value">{live.ordersToday}</span>
          </div>
        ) : (
          failed("Pedidos de hoy")
        )}

        {liveOk ? (
          <Link className="adm-stat adm-kpi" href="/admin/mesas?filtro=ocupadas">
            <span className="adm-stat__label">Mesas ocupadas</span>
            <span className="adm-stat__value">
              {live.occupiedTables} <small>de {live.tables.length}</small>
            </span>
            {go("Ver ocupadas")}
          </Link>
        ) : (
          failed("Mesas ocupadas")
        )}

        {liveOk ? (
          <Link className="adm-stat adm-kpi" href="/admin/mesas?filtro=llamando">
            <span className="adm-stat__label">Llamados pendientes</span>
            <span className={live.pendingCalls > 0 ? "adm-stat__value adm-stat__value--alert" : "adm-stat__value"}>
              {live.pendingCalls}
            </span>
            {live.pendingCalls === 0 ? <span className="adm-kpi__sub">Sin llamados</span> : null}
            {go("Ver mesas llamando")}
          </Link>
        ) : (
          failed("Llamados pendientes")
        )}

        {outOfStock !== null ? (
          <Link className="adm-stat adm-kpi" href="/admin/menu">
            <span className="adm-stat__label">Platos sin stock</span>
            <span className={outOfStock > 0 ? "adm-stat__value adm-stat__value--alert" : "adm-stat__value"}>
              {outOfStock}
            </span>
            {go("Ver en la carta")}
          </Link>
        ) : (
          failed("Platos sin stock")
        )}
      </section>

      {noOrders ? <EmptyState text="Todavía no entraron pedidos hoy." /> : null}

      <h2 className="adm-h2 adm-home__h2">Accesos rápidos</h2>
      <ul className="adm-quick">
        <li>
          <Link className="adm-tile adm-tile--primary" href="/admin/menu?nuevo=plato">
            <span className="adm-tile__icon">
              <Plus aria-hidden="true" />
            </span>
            Nuevo plato
          </Link>
        </li>
        <li>
          <Link className="adm-tile" href="/admin/mesas?nueva=1">
            <span className="adm-tile__icon">
              <LayoutGrid aria-hidden="true" />
            </span>
            Nueva mesa
          </Link>
        </li>
        <li>
          <Link className="adm-tile" href="/admin/mesas?imprimir=1">
            <span className="adm-tile__icon">
              <Printer aria-hidden="true" />
            </span>
            Imprimir todos los QR
          </Link>
        </li>
        <li>
          <Link className="adm-tile" href="/floor">
            <span className="adm-tile__icon">
              <ConciergeBell aria-hidden="true" />
            </span>
            Ir al Salón
          </Link>
        </li>
      </ul>
    </div>
  );
}
