"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, X } from "lucide-react";
import { CategoryFormDialog } from "@/components/admin/carta/CategoryFormDialog";
import { CategoryMenu } from "@/components/admin/carta/CategoryMenu";
import { ConfirmDialog } from "@/components/admin/carta/ConfirmDialog";
import { DishItem } from "@/components/admin/carta/DishItem";
import { DishSheet, isForeignKeyError, type DishPatch } from "@/components/admin/carta/DishSheet";
import { EmptyState } from "@/components/admin/carta/EmptyState";
import { PickCategoryDialog } from "@/components/admin/carta/PickCategoryDialog";
import { normalizeForSearch } from "@/components/admin/carta/normalize";
import { useAvailability } from "@/components/admin/carta/useAvailability";
import { useAdminLive } from "@/lib/admin/live/AdminLiveProvider";
import { deleteCategory } from "@/lib/admin/categories";
import { createMenuItem } from "@/lib/admin/menuItems";
import type { AdminCategory, AdminMenuItem } from "@/lib/types/adminMenu";

const ALL = "all";
const DISH_PARAM = "plato";

function dishUrl(id: string): string {
  return `/admin/menu?${DISH_PARAM}=${encodeURIComponent(id)}`;
}

function platos(n: number): string {
  return n === 1 ? "plato" : "platos";
}

// Carta (HU-6) + hoja de edición (HU-7). La hoja abierta vive en la URL
// (?plato=<id>) con history.pushState: Atrás la cierra sin salir de Carta
// (CA-7.11) y la lista no se vuelve a montar (scroll, píldora y búsqueda
// se mantienen, CA-6.10).
export function MenuBoard({
  restaurantId,
  categories,
}: {
  restaurantId: string;
  categories: AdminCategory[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const live = useAdminLive();
  const availability = useAvailability();

  // Cambios ya guardados que se muestran antes de que llegue el refresco
  // del servidor (CA-7.3). Se descartan al llegar datos nuevos.
  const [prevCategories, setPrevCategories] = useState(categories);
  const [patches, setPatches] = useState<Record<string, DishPatch>>({});
  const [hidden, setHidden] = useState<Record<string, true>>({});
  if (categories !== prevCategories) {
    setPrevCategories(categories);
    setPatches({});
    setHidden({});
    availability.dropSettled();
  }

  const [active, setActive] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(() => searchParams.get(DISH_PARAM));
  const [newId, setNewId] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteCat, setDeleteCat] = useState<AdminCategory | null>(null);
  const [deleteCatOpen, setDeleteCatOpen] = useState(false);
  const [deletingCat, setDeletingCat] = useState(false);

  const dirtyRef = useRef(false);
  const pushedRef = useRef(false);
  const openIdRef = useRef(openId);
  const triggerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    openIdRef.current = openId;
  }, [openId]);

  // ---------- Datos que se ven ----------
  const view = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        items: c.items
          .filter((i) => !hidden[i.id])
          .map((i): AdminMenuItem => (patches[i.id] ? { ...i, ...patches[i.id] } : i)),
      })),
    [categories, patches, hidden]
  );
  const { overrides } = availability;
  const isAvailable = useCallback(
    (item: AdminMenuItem) => overrides[item.id]?.value ?? item.isAvailable,
    [overrides]
  );

  const allItems = view.flatMap((c) => c.items);
  const totalDishes = allItems.length;
  const outOfStock = allItems.filter((i) => !isAvailable(i)).length;

  const activeCat = view.find((c) => c.id === active) ?? null;
  const effectiveActive = activeCat ? active : ALL;
  const q = normalizeForSearch(query);
  const sections = view
    .filter((c) => effectiveActive === ALL || c.id === effectiveActive)
    .map((c) => ({
      cat: c,
      items: q ? c.items.filter((i) => normalizeForSearch(i.name).includes(q)) : c.items,
    }))
    .filter((s) => !q || s.items.length > 0);
  const matches = sections.reduce((n, s) => n + s.items.length, 0);

  const openItem = openId ? (allItems.find((i) => i.id === openId) ?? null) : null;

  // ---------- Hoja: abrir / cerrar / Atrás ----------
  const openDish = useCallback((id: string, trigger?: HTMLElement | null) => {
    if (trigger !== undefined) triggerRef.current = trigger;
    window.history.pushState(null, "", dishUrl(id));
    pushedRef.current = true;
    setOpenId(id);
  }, []);

  const closeNow = useCallback(() => {
    setDiscardOpen(false);
    setOpenId(null);
    setNewId(null);
    dirtyRef.current = false;
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", "/admin/menu");
    }
  }, []);

  const requestClose = useCallback(() => {
    if (dirtyRef.current) setDiscardOpen(true);
    else closeNow();
  }, [closeNow]);

  useEffect(() => {
    const onPop = () => {
      const param = new URLSearchParams(window.location.search).get(DISH_PARAM);
      const current = openIdRef.current;
      if (!param && current) {
        if (dirtyRef.current) {
          // Atrás con cambios sin guardar: se vuelve a poner la entrada y se
          // pregunta antes de descartar (CA-7.4).
          window.history.pushState(null, "", dishUrl(current));
          pushedRef.current = true;
          setDiscardOpen(true);
        } else {
          pushedRef.current = false;
          setOpenId(null);
          setNewId(null);
        }
      } else if (param && !current) {
        pushedRef.current = true;
        setOpenId(param);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const finalFocus = useCallback((): HTMLElement | boolean | null => {
    const trigger = triggerRef.current;
    if (trigger?.isConnected) return trigger;
    return headingRef.current ?? true;
  }, []);

  const handleSaved = useCallback(
    (id: string, patch: DishPatch) => {
      setPatches((prev) => ({ ...prev, [id]: patch }));
      availability.forget(id);
      toast.success("Guardado");
      closeNow();
      router.refresh();
    },
    [availability, closeNow, router]
  );

  const handleDeleted = useCallback(
    (id: string) => {
      setHidden((prev) => ({ ...prev, [id]: true }));
      closeNow();
      router.refresh();
    },
    [closeNow, router]
  );

  // ---------- Nuevo plato (CA-6.13, CA-NR.13) ----------
  const createIn = async (categoryId: string) => {
    if (creating) return;
    const source = categories.find((c) => c.id === categoryId);
    if (!source) return;
    setCreating(true);
    try {
      const id = await createMenuItem(source.id, source.items.length);
      setPickOpen(false);
      setNewId(id);
      openDish(id);
      router.refresh();
    } catch {
      toast.error("No se pudo crear el plato");
    } finally {
      setCreating(false);
    }
  };

  const handleNewDish = (trigger: HTMLElement | null, categoryId?: string) => {
    triggerRef.current = trigger;
    if (categories.length === 0) {
      setCatFormOpen(true);
      return;
    }
    const target = categoryId ?? (activeCat ? activeCat.id : null);
    if (target) void createIn(target);
    else setPickOpen(true);
  };

  // ---------- Eliminar categoría (CA-NR.12, CA-6.14) ----------
  const handleDeleteCategory = async () => {
    if (!deleteCat) return;
    setDeletingCat(true);
    try {
      await deleteCategory(deleteCat.id);
      if (active === deleteCat.id) setActive(ALL);
      setDeleteCatOpen(false);
      router.refresh();
    } catch (err) {
      toast.error("No se pudo eliminar la categoría", {
        description: isForeignKeyError(err)
          ? "Tiene platos que ya recibieron pedidos y no se pueden borrar. Marcalos como sin stock."
          : undefined,
      });
    } finally {
      setDeletingCat(false);
    }
  };

  const newDishButton = (label: string, className = "adm-btn adm-btn--primary", categoryId?: string) => (
    <button
      type="button"
      className={className}
      disabled={creating}
      onClick={(e) => handleNewDish(e.currentTarget, categoryId)}
    >
      <Plus aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <div className="adm-page">
      <header className="adm-carta__head">
        <div style={{ minWidth: 0 }}>
          <p className="adm-eyebrow">Carta</p>
          <h1 ref={headingRef} tabIndex={-1} className="adm-h1" style={{ outline: "none" }}>
            Tu carta, al día
          </h1>
        </div>
        {newDishButton(creating ? "Creando..." : "Nuevo plato", "adm-btn adm-btn--primary adm-carta__new")}
      </header>

      <section className="adm-stats" aria-label="Resumen de la carta">
        <div className="adm-stat adm-stat--hot">
          <span className="adm-stat__label">Pedidos hoy</span>
          <span className="adm-stat__value">{live.ordersToday}</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__label">Platos en carta</span>
          <span className="adm-stat__value">{totalDishes}</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__label">Sin stock hoy</span>
          <span className={outOfStock > 0 ? "adm-stat__value adm-stat__value--alert" : "adm-stat__value"}>
            {outOfStock}
          </span>
        </div>
      </section>

      {categories.length > 0 ? (
        <>
          <ul className="adm-pills" aria-label="Filtrar por categoría">
            <li>
              <button
                type="button"
                className="adm-pill"
                aria-pressed={effectiveActive === ALL}
                aria-label={`Todas, ${totalDishes} ${platos(totalDishes)}`}
                onClick={() => setActive(ALL)}
              >
                Todas
                <span aria-hidden="true">·</span>
                <span className="adm-pill__count">{totalDishes}</span>
              </button>
            </li>
            {view.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="adm-pill"
                  aria-pressed={effectiveActive === c.id}
                  aria-label={`${c.name}, ${c.items.length} ${platos(c.items.length)}`}
                  onClick={() => setActive(c.id)}
                >
                  {c.name}
                  <span aria-hidden="true">·</span>
                  <span className="adm-pill__count">{c.items.length}</span>
                </button>
              </li>
            ))}
            <li>
              <button type="button" className="adm-pill adm-pill--add" onClick={() => setCatFormOpen(true)}>
                <Plus aria-hidden="true" />
                <span className="sr-only">Nueva </span>
                Categoría
              </button>
            </li>
          </ul>

          <div className="adm-search" role="search">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="adm-search-dish">
              Buscar plato
            </label>
            <input
              id="adm-search-dish"
              type="search"
              className="adm-input"
              placeholder="Buscar plato"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
            />
            {query ? (
              <button
                type="button"
                className="adm-icon-btn"
                aria-label="Limpiar búsqueda"
                onClick={() => setQuery("")}
              >
                <X aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {q ? `${matches} ${platos(matches)} encontrados` : ""}
          </p>
        </>
      ) : null}

      {categories.length === 0 ? (
        <EmptyState
          text="Tu carta está vacía. Creá la primera categoría y empezá a sumar platos."
          action={
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => setCatFormOpen(true)}>
              <Plus aria-hidden="true" />
              Nueva categoría
            </button>
          }
        />
      ) : q && matches === 0 ? (
        <EmptyState
          text={`No encontramos platos con "${query.trim()}".`}
          action={
            <button type="button" className="adm-btn" onClick={() => setQuery("")}>
              Limpiar búsqueda
            </button>
          }
        />
      ) : (
        sections.map(({ cat, items }) => (
          <section key={cat.id} className="adm-cat" aria-labelledby={`cat-${cat.id}`}>
            <div className="adm-cat__head">
              <h2 id={`cat-${cat.id}`} className="adm-h2">
                {cat.name} <span className="adm-cat__count">· {cat.items.length}</span>
              </h2>
              <CategoryMenu
                name={cat.name}
                disabled={creating}
                onNewDish={() => handleNewDish(null, cat.id)}
                onDelete={() => {
                  setDeleteCat(cat);
                  setDeleteCatOpen(true);
                }}
              />
            </div>
            {items.length === 0 ? (
              activeCat ? (
                <EmptyState
                  text="Esta categoría todavía no tiene platos."
                  action={newDishButton("Nuevo plato", "adm-btn adm-btn--primary", cat.id)}
                />
              ) : (
                <div className="adm-cat__empty">
                  <span>Esta categoría todavía no tiene platos.</span>
                  {newDishButton("Nuevo plato", "adm-btn", cat.id)}
                </div>
              )
            ) : (
              <ul className="adm-dishes">
                {items.map((item) => (
                  <DishItem
                    key={item.id}
                    item={item}
                    available={isAvailable(item)}
                    onOpen={openDish}
                    onToggle={availability.toggle}
                  />
                ))}
              </ul>
            )}
          </section>
        ))
      )}

      <button
        type="button"
        className="adm-fab"
        aria-label="Nuevo plato"
        disabled={creating}
        onClick={(e) => handleNewDish(e.currentTarget)}
      >
        <Plus aria-hidden="true" />
      </button>

      <CategoryFormDialog
        open={catFormOpen}
        onOpenChange={setCatFormOpen}
        restaurantId={restaurantId}
        nextSortOrder={categories.length}
      />
      <PickCategoryDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        categories={view}
        busy={creating}
        onPick={(c) => void createIn(c.id)}
      />
      <ConfirmDialog
        open={deleteCatOpen}
        title={
          deleteCat
            ? `¿Eliminar la categoría "${deleteCat.name}" y sus ${deleteCat.items.length} platos?`
            : ""
        }
        description="Se borran también sus platos y opciones. No se puede deshacer."
        confirmLabel="Eliminar categoría"
        busyLabel="Eliminando..."
        busy={deletingCat}
        onConfirm={handleDeleteCategory}
        onCancel={() => setDeleteCatOpen(false)}
      />
      <DishSheet
        open={openId !== null}
        item={openItem}
        loading={openId !== null && openId === newId}
        isNew={openId !== null && openId === newId}
        dirtyRef={dirtyRef}
        discardOpen={discardOpen}
        finalFocus={finalFocus}
        onRequestClose={requestClose}
        onDiscardConfirm={closeNow}
        onDiscardCancel={() => setDiscardOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
