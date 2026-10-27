"use client";

import { useCallback, useMemo, useState } from "react";
import type { TranquilityDashboard, TranquilityMovement } from "../types";
import {
  buildMovementPayload,
  filterMovements,
  todayDate,
} from "../utils/movementUtils";

type Args = {
  dashboard: TranquilityDashboard;
  onSubmit: (body: object) => Promise<unknown>;
  onEdit: (id: string, body: object) => Promise<unknown>;
};

export function useMovementForm({ dashboard, onSubmit, onEdit }: Args) {
  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">(
    "EXPENSE",
  );
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [date, setDate] = useState(todayDate);
  const [rate, setRate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    type: "",
    categoryId: "",
    query: "",
  });

  const source = dashboard.accounts.find((item) => item.id === accountId);
  const destination = dashboard.accounts.find(
    (item) => item.id === destinationId,
  );
  const targetCurrency =
    type === "TRANSFER" ? destination?.currency : dashboard.currency;
  const needsFx = Boolean(
    source && targetCurrency && source.currency !== targetCurrency,
  );
  const convertedAmount = useMemo(() => {
    if (!needsFx || !amount || !rate) return null;
    try {
      return (
        buildMovementPayload(
          {
            type,
            amount,
            concept,
            note,
            categoryId,
            accountId,
            destinationId,
            date,
            rate,
          },
          dashboard,
        ).fxSnapshot?.convertedAmount ?? null
      );
    } catch {
      return null;
    }
  }, [
    accountId,
    amount,
    categoryId,
    concept,
    dashboard,
    date,
    destinationId,
    needsFx,
    note,
    rate,
    type,
  ]);

  const reset = useCallback(() => {
    setAmount("");
    setConcept("");
    setNote("");
    setCategoryId("");
    setAccountId("");
    setDestinationId("");
    setRate("");
    setEditingId(null);
    setDate(todayDate());
    setFormError(null);
  }, []);

  const submit = useCallback(async () => {
    try {
      const payload = buildMovementPayload(
        {
          type,
          amount,
          concept,
          note,
          categoryId,
          accountId,
          destinationId,
          date,
          rate,
        },
        dashboard,
      );
      if (editingId) await onEdit(editingId, payload);
      else await onSubmit(payload);
      reset();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No pudimos guardar el movimiento.",
      );
    }
  }, [
    accountId,
    amount,
    categoryId,
    concept,
    dashboard,
    date,
    destinationId,
    editingId,
    note,
    onEdit,
    onSubmit,
    rate,
    reset,
    type,
  ]);

  const beginEdit = useCallback((item: TranquilityMovement) => {
    if (item.editable === false) return;
    setEditingId(item.id);
    setType(item.type);
    setAmount(item.amount);
    setConcept(item.concept);
    setNote(item.note ?? "");
    setCategoryId(item.categoryId ?? "");
    setAccountId(item.financeAccountId ?? "");
    setDestinationId(item.destinationAccountId ?? "");
    setDate(item.date);
    setRate(item.fxSnapshot?.rate ?? "");
    setFormError(null);
  }, []);

  return {
    type,
    setType,
    amount,
    setAmount,
    concept,
    setConcept,
    note,
    setNote,
    categoryId,
    setCategoryId,
    accountId,
    setAccountId,
    destinationId,
    setDestinationId,
    date,
    setDate,
    rate,
    setRate,
    editingId,
    formError,
    targetCurrency,
    needsFx,
    convertedAmount,
    filters,
    setFilters,
    visible: filterMovements(dashboard.movements, filters),
    submit,
    reset,
    beginEdit,
  };
}
