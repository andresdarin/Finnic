export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-alt motion-reduce:animate-none" />
      ))}
    </div>
  )
}
