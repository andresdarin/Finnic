import { SiteHeader } from '@/features/home/components/SiteHeader'
import { Hero } from '@/features/home/components/Hero'
import { WhatsAppSection } from '@/features/home/components/WhatsAppSection'
import { FeatureGrid } from '@/features/home/components/FeatureGrid'
import { Showcase } from '@/features/home/components/Showcase'
import { PrivacySection } from '@/features/home/components/PrivacySection'
import { Faq } from '@/features/home/components/Faq'
import { FinalCta } from '@/features/home/components/FinalCta'
import { SiteFooter } from '@/features/home/components/SiteFooter'

export default function HomePage() {
  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-white">
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido">
        <Hero />
        <WhatsAppSection />
        <FeatureGrid />
        <Showcase />
        <PrivacySection />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  )
}
