import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Private Markets Dossier',
  description: 'Look up private company valuations and build your portfolio',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
