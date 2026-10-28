export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums sm:text-[32px]">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
