import { CreateTranquilityMovementSchema } from "@lovehold/shared";
import { convertCurrency } from "@lovehold/shared";
import type { TranquilityDashboard, TranquilityMovement } from "../types";
import { decimal } from "../utils";

export const todayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export type MovementDraft = {
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  amount: string;
  concept: string;
  note: string;
  categoryId: string;
  accountId: string;
  destinationId: string;
  date: string;
  rate: string;
};

export function buildMovementPayload(
  draft: MovementDraft,
  dashboard: TranquilityDashboard,
) {
  const amount = decimal(draft.amount);
  const source = dashboard.accounts.find((item) => item.id === draft.accountId);
  const destination = dashboard.accounts.find(
    (item) => item.id === draft.destinationId,
  );
  const targetCurrency =
    draft.type === "TRANSFER" ? destination?.currency : dashboard.currency;
  if (
    !amount ||
    Number(amount) <= 0 ||
    !draft.concept.trim() ||
    !source ||
    !targetCurrency
  ) {
    throw new Error("Completá un importe positivo, concepto y cuenta válida.");
  }
  const differentCurrency = source.currency !== targetCurrency;
  if (
    differentCurrency &&
    (!draft.rate.trim() || Number(draft.rate.replace(",", ".")) <= 0)
  ) {
    throw new Error(
      "Ingresá una cotización positiva para convertir las monedas.",
    );
  }
  const fxSnapshot = differentCurrency
    ? {
        toCurrency: targetCurrency,
        rate: draft.rate.trim().replace(",", "."),
        convertedAmount: convertCurrency(
          amount,
          draft.rate.trim().replace(",", "."),
        ),
        asOf: draft.date,
      }
    : null;
  const payload = {
    type: draft.type,
    amount,
    currency: source.currency,
    date: draft.date,
    concept: draft.concept.trim(),
    categoryId: draft.type === "EXPENSE" ? draft.categoryId || null : null,
    note: draft.note.trim() || null,
    financeAccountId: source.id,
    destinationAccountId:
      draft.type === "TRANSFER" ? draft.destinationId || null : null,
    fxSnapshot,
  };
  const result = CreateTranquilityMovementSchema.safeParse(payload);
  if (!result.success)
    throw new Error(
      result.error.issues[0]?.message ?? "Revisá los datos del movimiento.",
    );
  return result.data;
}

export function filterMovements(
  items: TranquilityMovement[],
  filters: {
    dateFrom: string;
    dateTo: string;
    type: string;
    categoryId: string;
    query: string;
  },
) {
  const query = filters.query.trim().toLowerCase();
  return items.filter(
    (item) =>
      (!filters.dateFrom || item.date >= filters.dateFrom) &&
      (!filters.dateTo || item.date <= filters.dateTo) &&
      (!filters.type || item.type === filters.type) &&
      (!filters.categoryId || item.categoryId === filters.categoryId) &&
      (!query ||
        `${item.concept} ${item.note ?? ""}`.toLowerCase().includes(query)),
  );
}
