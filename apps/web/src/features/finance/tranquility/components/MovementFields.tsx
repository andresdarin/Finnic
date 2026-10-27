"use client";

import type { TranquilityDashboard } from "../types";
import type { ReturnTypeUseMovementForm } from "../hooks/movementTypes";
import { money } from "../utils";
import { Button, Field, SegmentedField, SelectField } from "./Primitives";

type Props = {
  dashboard: TranquilityDashboard;
  state: ReturnTypeUseMovementForm;
  saving: boolean;
  onSubmit: () => Promise<void>;
};

export function MovementFields({ dashboard, state, saving, onSubmit }: Props) {
  const operating = dashboard.accounts.filter(
    (account) => account.purpose === "OPERATING",
  );
  const accounts = state.type === "TRANSFER" ? dashboard.accounts : operating;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <SegmentedField
        label="Tipo"
        value={state.type}
        onChange={state.setType}
        options={[
          { value: "EXPENSE", label: "Gasto" },
          { value: "INCOME", label: "Ingreso" },
          { value: "TRANSFER", label: "Transferencia" },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Importe"
          value={state.amount}
          onChange={(event) => state.setAmount(event.target.value)}
          inputMode="decimal"
          placeholder="0,00"
          required
        />
        <Field
          label="Fecha"
          type="date"
          value={state.date}
          onChange={(event) => state.setDate(event.target.value)}
          required
        />
      </div>
      <Field
        label="Concepto"
        value={state.concept}
        onChange={(event) => state.setConcept(event.target.value)}
        placeholder="Ej. supermercado"
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label={state.type === "TRANSFER" ? "Cuenta origen" : "Cuenta"}
          value={state.accountId}
          onChange={(event) => state.setAccountId(event.target.value)}
          required
        >
          <option value="">Seleccioná una cuenta</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id} data-hint={`Saldo ${money(account.balance, account.currency)}`}>
              {account.name} · {account.currency}
            </option>
          ))}
        </SelectField>
        {state.type === "EXPENSE" && (
          <SelectField
            label="Categoría"
            value={state.categoryId}
            onChange={(event) => state.setCategoryId(event.target.value)}
            required
          >
            <option value="">Seleccioná una categoría</option>
            {dashboard.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
        )}
        {state.type === "TRANSFER" && (
          <SelectField
            label="Cuenta destino"
            value={state.destinationId}
            onChange={(event) => state.setDestinationId(event.target.value)}
            required
          >
            <option value="">Seleccioná una cuenta</option>
            {dashboard.accounts
              .filter((account) => account.id !== state.accountId)
              .map((account) => (
                <option key={account.id} value={account.id} data-hint={`Saldo ${money(account.balance, account.currency)}`}>
                  {account.name} · {account.currency}
                </option>
              ))}
          </SelectField>
        )}
      </div>
      <Field
        label="Nota (opcional)"
        value={state.note}
        onChange={(event) => state.setNote(event.target.value)}
        maxLength={500}
        placeholder="Un detalle para recordar"
      />
      {state.needsFx && (
        <div className="grid gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:grid-cols-3">
          <div className="text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Conversión
            </span>
            <strong>
              {
                dashboard.accounts.find(
                  (account) => account.id === state.accountId,
                )?.currency
              }{" "}
              → {state.targetCurrency}
            </strong>
          </div>
          <Field
            label="Cotización"
            value={state.rate}
            onChange={(event) => state.setRate(event.target.value)}
            inputMode="decimal"
            placeholder="Ej. 40,25"
            required
          />
          <div className="text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Importe convertido
            </span>
            <strong className="block pt-2">
              {state.convertedAmount ?? "—"} {state.targetCurrency}
            </strong>
            <span className="text-xs text-muted-foreground">
              Se registra con la fecha del movimiento.
            </span>
          </div>
        </div>
      )}
      {state.formError && (
        <p className="text-sm text-danger" role="alert">
          {state.formError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1 sm:flex-none">
          {state.editingId ? "Guardar cambios" : "Registrar movimiento"}
        </Button>
        {state.editingId && (
          <Button variant="quiet" onClick={state.reset}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
