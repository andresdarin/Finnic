import { describe, expect, it } from "vitest";
import type { TranquilityDashboard } from "../types";
import { buildMovementPayload, filterMovements } from "./movementUtils";

const dashboard = {
  currency: "UYU",
  accounts: [
    {
      id: "uy",
      name: "Pesos",
      currency: "UYU",
      purpose: "OPERATING",
      balance: "1000.00",
      openingBalance: "1000.00",
    },
    {
      id: "usd",
      name: "Dólares",
      currency: "USD",
      purpose: "OPERATING",
      balance: "50.00",
      openingBalance: "50.00",
    },
  ],
  categories: [{ id: "food", name: "Comida", bucket: "NEEDS" }],
} as unknown as TranquilityDashboard;

describe("movement payloads", () => {
  it("creates a dated FX snapshot with the shared conversion", () => {
    const payload = buildMovementPayload(
      {
        type: "EXPENSE",
        amount: "10",
        concept: "Café",
        note: "",
        categoryId: "food",
        accountId: "usd",
        destinationId: "",
        date: "2026-10-14",
        rate: "40.25",
      },
      dashboard,
    );
    expect(payload.fxSnapshot).toEqual({
      toCurrency: "UYU",
      rate: "40.25",
      convertedAmount: "402.50",
      asOf: "2026-10-14",
    });
  });

  it("rejects zero and negative values before the API", () => {
    expect(() =>
      buildMovementPayload(
        {
          type: "EXPENSE",
          amount: "10",
          concept: "Café",
          note: "",
          categoryId: "food",
          accountId: "usd",
          destinationId: "",
          date: "2026-10-14",
          rate: "0",
        },
        dashboard,
      ),
    ).toThrow("cotización positiva");
    expect(() =>
      buildMovementPayload(
        {
          type: "EXPENSE",
          amount: "-1",
          concept: "Café",
          note: "",
          categoryId: "food",
          accountId: "uy",
          destinationId: "",
          date: "2026-10-14",
          rate: "",
        },
        dashboard,
      ),
    ).toThrow("importe positivo");
  });

  it("filters by dates, type, category, and text", () => {
    const items = [
      {
        id: "1",
        date: "2026-10-01",
        type: "EXPENSE",
        categoryId: "food",
        concept: "Café",
        note: null,
      },
      {
        id: "2",
        date: "2026-10-20",
        type: "INCOME",
        categoryId: null,
        concept: "Sueldo",
        note: null,
      },
    ] as never[];
    expect(
      filterMovements(items, {
        dateFrom: "2026-10-10",
        dateTo: "",
        type: "INCOME",
        categoryId: "",
        query: "sueldo",
      }),
    ).toHaveLength(1);
  });
});
