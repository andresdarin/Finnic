export function AuthCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-7 shadow-[0_1px_2px_rgba(8,58,79,0.06),0_12px_32px_-12px_rgba(8,58,79,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">Finnic · Admin</p>
        <h1 className="mt-2 font-display text-2xl">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  )
}
