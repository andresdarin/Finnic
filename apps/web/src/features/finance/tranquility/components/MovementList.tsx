"use client";

import { useEffect, useState } from "react";
import type { TranquilityDashboard, TranquilityMovement } from "../types";
import type { ReturnTypeUseMovementForm } from "../hooks/movementTypes";
import { money } from "../utils";
import { Button, Card, Field, SectionTitle, SelectField } from "./Primitives";

type Props = {
  dashboard: TranquilityDashboard;
  state: ReturnTypeUseMovementForm;
  onDelete: (id: string) => Promise<unknown>;
  onEdit: (item: TranquilityMovement) => void;
};

export function MovementList({ dashboard, state, onDelete, onEdit }: Props) {
  const [pending, setPending] = useState<TranquilityMovement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPending(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [pending]);
  const categoryName = (id: string | null) =>
    dashboard.categories.find((category) => category.id === id)?.name ??
    "Sin categoría";
  const accountName = (id: string | null) =>
    dashboard.accounts.find((account) => account.id === id)?.name ??
    "Cuenta histórica";
  const updateFilter = (key: keyof typeof state.filters, value: string) =>
    state.setFilters((current) => ({ ...current, [key]: value }));
  const confirmDelete = async () => {
    if (!pending) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(pending.id);
      setPending(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos borrar el movimiento.",
      );
    } finally {
      setDeleting(false);
    }
  };
  return (
    <Card>
      <SectionTitle
        eyebrow="HISTORIAL"
        title="Movimientos"
        detail="Filtrá por período, tipo, categoría o texto. Las cuentas y monedas siempre se muestran por separado."
      />
      <div className="grid gap-3 sm:grid-cols-5">
        <Field
          label="Desde"
          type="date"
          value={state.filters.dateFrom}
          onChange={(event) => updateFilter("dateFrom", event.target.value)}
        />
        <Field
          label="Hasta"
          type="date"
          value={state.filters.dateTo}
          onChange={(event) => updateFilter("dateTo", event.target.value)}
        />
        <SelectField
          label="Tipo"
          value={state.filters.type}
          onChange={(event) => updateFilter("type", event.target.value)}
        >
          <option value="">Todos</option>
          <option value="EXPENSE">Gastos</option>
          <option value="INCOME">Ingresos</option>
          <option value="TRANSFER">Transferencias</option>
        </SelectField>
        <SelectField
          label="Categoría"
          value={state.filters.categoryId}
          onChange={(event) => updateFilter("categoryId", event.target.value)}
        >
          <option value="">Todas</option>
          {dashboard.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <Field
          label="Buscar"
          value={state.filters.query}
          onChange={(event) => updateFilter("query", event.target.value)}
          placeholder="Concepto o nota"
        />
      </div>
      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <ul className="mt-4 divide-y divide-border">
        {state.visible.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">{item.concept}</p>
              <p className="text-xs text-muted-foreground">
                {item.date} ·{" "}
                {item.type === "TRANSFER"
                  ? `${accountName(item.financeAccountId)} → ${accountName(item.destinationAccountId)}`
                  : categoryName(item.categoryId)}
              </p>
              {item.note && (
                <p className="text-xs text-muted-foreground">{item.note}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold">
                  {money(item.amount, item.currency)}{" "}
                  <span className="text-xs text-muted-foreground">
                    {item.currency}
                  </span>
                </p>
                {item.fxSnapshot && (
                  <p className="text-xs text-muted-foreground">
                    →{" "}
                    {money(
                      item.fxSnapshot.convertedAmount,
                      item.fxSnapshot.toCurrency,
                    )}{" "}
                    · cotización {item.fxSnapshot.rate}
                  </p>
                )}
              </div>
              {item.editable !== false && (
                <>
                  <Button variant="quiet" onClick={() => onEdit(item)}>
                    Editar
                  </Button>
                  <Button variant="quiet" onClick={() => setPending(item)}>
                    Borrar
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!state.visible.length && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay movimientos con esos filtros.
        </p>
      )}
      {pending && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4"
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="movement-delete-title"
            aria-describedby="movement-delete-description"
          >
            <h3 id="movement-delete-title" className="text-lg font-semibold">
              ¿Borrar movimiento?
            </h3>
            <p
              id="movement-delete-description"
              className="mt-2 text-sm text-muted-foreground"
            >
              Se eliminará “{pending.concept}”. Esta acción no se puede
              deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="quiet"
                onClick={() => setPending(null)}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button onClick={() => void confirmDelete()} disabled={deleting}>
                {deleting ? "Borrando…" : "Borrar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
