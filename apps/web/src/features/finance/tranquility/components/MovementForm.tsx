"use client";

import type { TranquilityDashboard, TranquilityMovement } from "../types";
import { Card, SectionTitle } from "./Primitives";
import { MovementFields } from "./MovementFields";
import { MovementList } from "./MovementList";
import { useMovementForm } from "../hooks/useMovementForm";

export type MovementFormProps = {
  dashboard: TranquilityDashboard;
  saving: boolean;
  onSubmit: (body: object) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onEdit: (id: string, body: object) => Promise<unknown>;
};

export function MovementForm({
  dashboard,
  saving,
  onSubmit,
  onDelete,
  onEdit,
}: MovementFormProps) {
  const movement = useMovementForm({ dashboard, onSubmit, onEdit });

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle
          eyebrow="MOVIMIENTOS"
          title={
            movement.editingId ? "Editar movimiento" : "Registrar movimiento"
          }
          detail="Las transferencias mueven dinero entre cuentas; no son gastos ni ingresos."
        />
        <MovementFields
          dashboard={dashboard}
          state={movement}
          saving={saving}
          onSubmit={movement.submit}
        />
      </Card>
      <MovementList
        dashboard={dashboard}
        state={movement}
        onDelete={onDelete}
        onEdit={movement.beginEdit}
      />
    </div>
  );
}

export type { TranquilityMovement };
