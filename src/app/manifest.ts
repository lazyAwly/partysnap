import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PartySnap',
    short_name: 'PartySnap',
    description: 'Share party photos instantly',
    start_url: '/',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#4f46e5',
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
