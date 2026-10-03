"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Printer } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/carta/ConfirmDialog";
import { EmptyState } from "@/components/admin/carta/EmptyState";
import { NewTableDialog } from "@/components/admin/mesas/NewTableDialog";
import { PrintView } from "@/components/admin/mesas/PrintView";
import { TableCard } from "@/components/admin/mesas/TableCard";
import { TableSheet } from "@/components/admin/mesas/TableSheet";
import { FILTERS, hasOrders, type TableFilter } from "@/components/admin/mesas/tableState";
import { useAdminLive } from "@/lib/admin/live/AdminLiveProvider";
import { deleteTable } from "@/lib/admin/tables";
import type { AdminTable } from "@/lib/admin/getAdminTables";
import type { AdminLiveTable } from "@/lib/admin/live/types";

const TABLE_PARAM = "mesa";

function mesas(n: number): string {
  return n === 1 ? "mesa" : "mesas";
}

// Mesas (HU-8). La lista y su orden salen del servidor (CA-NR.30); el estado
// de cada mesa, de la instantánea en vivo del admin (una sola suscripción,
// R-9). `tables` no se escucha en Realtime (SEC-AD-04): tras crear o borrar
// una mesa se llama a refresh(). La hoja de celular vive en la URL
// (?mesa=<id>) para que Atrás la cierre sin salir de Mesas.
export function TablesBoard({ restaurantId, tables }: { restaurantId: string; tables: AdminTable[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const live = useAdminLive();

  // Mesas borradas que se ocultan antes de que llegue el refresco del servidor.
  const [prevTables, setPrevTables] = useState(tables);
  const [hidden, setHidden] = useState<Record<string, true>>({});
  if (tables !== prevTables) {
    setPrevTables(tables);
    setHidden({});
  }

  const [filter, setFilter] = useState<TableFilter>("all");
  const [openId, setOpenId] = useState<string | null>(() => searchParams.get(TABLE_PARAM));
  const [newOpen, setNewOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AdminTable | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [announce, setAnnounce] = useState("");

  const pushedRef = useRef(false);
  const openIdRef = useRef(openId);
  const triggerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mountedAt = useRef(0);

  useEffect(() => {
    openIdRef.current = openId;
  }, [openId]);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  // ---------- Datos ----------
  const liveById = useMemo(() => {
    const map = new Map<string, AdminLiveTable>();
    for (const t of live.tables) map.set(t.id, t);
    return map;
  }, [live.tables]);

  const list = tables.filter((t) => !hidden[t.id]);
  const stateOf = (t: AdminTable) => liveById.get(t.id)?.state ?? "free";
  const counts: Record<TableFilter, number> = { all: list.length, free: 0, occupied: 0, calling: 0 };
  for (const t of list) counts[stateOf(t)]++;
  const shown = filter === "all" ? list : list.filter((t) => stateOf(t) === filter);
  const openTable = openId ? (list.find((t) => t.id === openId) ?? null) : null;

  // Un llamado nuevo se anuncia a lectores de pantalla (CA-8.6), sin sonido ni toast.
  const { lastCallEvent } = live;
  useEffect(() => {
    if (lastCallEvent && lastCallEvent.at > mountedAt.current) {
      setAnnounce(`${lastCallEvent.tableLabel} llama al mozo`);
    }
  }, [lastCallEvent]);

  // ---------- Hoja (celular) ----------
  const openSheet = useCallback((id: string, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    window.history.pushState(null, "", `/admin/mesas?${TABLE_PARAM}=${encodeURIComponent(id)}`);
    pushedRef.current = true;
    setOpenId(id);
  }, []);

  const closeSheet = useCallback(() => {
    setOpenId(null);
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", "/admin/mesas");
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      const param = new URLSearchParams(window.location.search).get(TABLE_PARAM);
      if (!param && openIdRef.current) {
        pushedRef.current = false;
        setOpenId(null);
      } else if (param && !openIdRef.current) {
        pushedRef.current = true;
        setOpenId(param);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Si el disparador ya no existe (mesa borrada), el foco va al título.
  const finalFocus = useCallback((): HTMLElement | boolean | null => {
    const trigger = triggerRef.current;
    if (trigger?.isConnected) return trigger;
    return headingRef.current ?? true;
  }, []);

  // ---------- Crear / borrar ----------
  const refreshAll = useCallback(() => {
    router.refresh();
    void live.refresh();
  }, [router, live]);

  const handleCreated = (label: string) => {
    setAnnounce(`${label} creada`);
    refreshAll();
  };

  const askDelete = (table: AdminTable) => {
    setToDelete(table);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteTable(toDelete.id);
      setHidden((prev) => ({ ...prev, [toDelete.id]: true }));
      setConfirmOpen(false);
      setAnnounce(`${toDelete.label} eliminada`);
      if (openIdRef.current === toDelete.id) closeSheet();
      refreshAll();
    } catch {
      toast.error("No se pudo eliminar la mesa");
    } finally {
      setDeleting(false);
    }
  };

  const confirm = (
    <ConfirmDialog
      open={confirmOpen}
      title={toDelete ? `¿Eliminar "${toDelete.label}"? El QR impreso dejará de funcionar.` : ""}
      description={hasOrders(toDelete ? liveById.get(toDelete.id) : undefined) ? "También se borran sus pedidos." : undefined}
      confirmLabel="Eliminar mesa"
      busyLabel="Eliminando..."
      busy={deleting}
      finalFocus={finalFocus}
      onConfirm={handleDelete}
      onCancel={() => setConfirmOpen(false)}
    />
  );

  const empty = list.length === 0;

  return (
    <div className="adm-page">
      <header className="adm-mesas__head">
        <div style={{ minWidth: 0 }}>
          <p className="adm-eyebrow">Mesas</p>
          <h1 ref={headingRef} tabIndex={-1} className="adm-h1" style={{ outline: "none" }}>
            Tu salón, de un vistazo
          </h1>
        </div>
        <div className="adm-mesas__actions">
          <button
            type="button"
            className="adm-btn"
            disabled={empty}
            aria-describedby={empty ? "adm-print-hint" : undefined}
            onClick={() => setPrintOpen(true)}
          >
            <Printer aria-hidden="true" />
            Imprimir todos
          </button>
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => setNewOpen(true)}>
            <Plus aria-hidden="true" />
            Nueva mesa
          </button>
          {empty ? (
            <p id="adm-print-hint" className="adm-mesas__hint">
              Creá una mesa para imprimir
            </p>
          ) : null}
        </div>
      </header>

      {empty ? (
        <EmptyState
          text="Todavía no hay mesas. Creá la primera y bajá su QR."
          action={
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => setNewOpen(true)}>
              <Plus aria-hidden="true" />
              Nueva mesa
            </button>
          }
        />
      ) : (
        <>
          <ul className="adm-pills" aria-label="Filtrar por estado">
            {FILTERS.map((f) => (
              <li key={f.key}>
                <button
                  type="button"
                  className="adm-pill"
                  data-filter={f.key}
                  aria-pressed={filter === f.key}
                  aria-label={`${f.label}, ${counts[f.key]} ${mesas(counts[f.key])}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  <span aria-hidden="true">·</span>
                  <span className="adm-pill__count">{counts[f.key]}</span>
                </button>
              </li>
            ))}
          </ul>

          {shown.length === 0 ? (
            <EmptyState
              text={FILTERS.find((f) => f.key === filter)?.empty ?? ""}
              action={
                <button type="button" className="adm-btn" onClick={() => setFilter("all")}>
                  Ver todas
                </button>
              }
            />
          ) : (
            <ul className="adm-tables">
              {shown.map((t) => (
                <TableCard key={t.id} table={t} live={liveById.get(t.id)} onOpen={openSheet} onDelete={askDelete} />
              ))}
            </ul>
          )}
        </>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {openId ? null : confirm}
      <TableSheet
        open={openId !== null}
        table={openTable}
        live={openTable ? liveById.get(openTable.id) : undefined}
        finalFocus={finalFocus}
        onClose={closeSheet}
        onDelete={askDelete}
      >
        {openId ? confirm : null}
      </TableSheet>
      <NewTableDialog open={newOpen} onOpenChange={setNewOpen} restaurantId={restaurantId} onCreated={handleCreated} />
      <PrintView open={printOpen} onOpenChange={setPrintOpen} tables={list} />
    </div>
  );
}
