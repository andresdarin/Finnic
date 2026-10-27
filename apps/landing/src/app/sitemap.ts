import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/privacy', '/terms'].map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: 'monthly', priority: path ? 0.3 : 1 }))
}
