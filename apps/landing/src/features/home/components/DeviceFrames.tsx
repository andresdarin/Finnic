import Image from 'next/image'

interface ShotProps {
  src: string
  alt: string
  priority?: boolean
  className?: string
}

/** Ventana de navegador minimalista alrededor de una captura de escritorio (1440×900). */
export function BrowserFrame({ src, alt, priority, className = '' }: ShotProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_40px_100px_-40px_rgba(6,43,59,0.55)] ${className}`}>
      <div className="flex h-8 items-center gap-1.5 border-b border-black/[0.06] bg-[#F4F2EF] px-3" aria-hidden>
        <span className="size-2.5 rounded-full bg-[#E5E1DD]" />
        <span className="size-2.5 rounded-full bg-[#E5E1DD]" />
        <span className="size-2.5 rounded-full bg-[#E5E1DD]" />
        <span className="ml-3 h-4 w-40 rounded-full bg-[#E9E6E2]" />
      </div>
      <Image src={src} alt={alt} width={1920} height={1200} priority={priority} sizes="(min-width: 1024px) 860px, 92vw" className="block h-auto w-full" />
    </div>
  )
}

/** Marco de teléfono para capturas mobile (390×844). */
export function PhoneFrame({ src, alt, priority, className = '' }: ShotProps) {
  return (
    <div className={`rounded-[2.4rem] bg-[#0B1F28] p-[7px] shadow-[0_40px_80px_-30px_rgba(6,43,59,0.6)] ring-1 ring-black/20 ${className}`}>
      <div className="overflow-hidden rounded-[2rem] bg-white">
        <Image src={src} alt={alt} width={780} height={1688} priority={priority} sizes="(min-width: 1024px) 280px, 60vw" className="block h-auto w-full" />
      </div>
    </div>
  )
}
