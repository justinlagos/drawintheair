import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://drawintheair.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/pricing',
          '/about',
          '/activities',
          '/for-teachers',
          '/for-schools',
          '/privacy',
        ],
        disallow: [
          '/dashboard/',
          '/admin/',
          '/school/',
          '/classroom/',
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
