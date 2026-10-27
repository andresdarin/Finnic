interface ProfileBioBlockProps {
  bio?: string | null
}

/**
 * Compact editorial bio/quote block. Shows the user's bio if available,
 * or a subtle placeholder encouraging profile completion.
 */
export function ProfileBioBlock({ bio }: ProfileBioBlockProps) {
  const hasBio = bio && bio.trim().length > 0

  return (
    <div className="relative rounded-xl border-l-2 border-primary/30 bg-surface-soft/20 px-4 py-3">
      <p
        className={`text-sm leading-relaxed ${
          hasBio ? 'text-foreground/80 italic' : 'text-muted-foreground italic'
        }`}
      >
        {hasBio
          ? bio
          : 'Completá tu perfil para personalizar tu identidad financiera.'}
      </p>
    </div>
  )
}
