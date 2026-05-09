import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PartySnap',
  description: 'Share party photos instantly',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
