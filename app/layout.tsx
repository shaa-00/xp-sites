import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { Poppins, Quicksand } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-general-sans',
  display: 'swap',
})

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-quicksand',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'XP-Farm | Curated Developer & AI Links',
  description: 'A minimalist collection of curated developer tools, AI agents, MCP resources, and open-source bookmarks.',
  metadataBase: new URL('https://xp-sites.vercel.app'),
  openGraph: {
    title: 'XP-Farm | Curated Developer & AI Links',
    description: 'A minimalist collection of curated developer tools, AI agents, MCP resources, and open-source bookmarks.',
    url: 'https://xp-sites.vercel.app',
    siteName: 'XP-Farm',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XP-Farm | Curated Developer & AI Links',
    description: 'A minimalist collection of curated developer tools, AI agents, MCP resources, and open-source bookmarks.',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`bg-background ${poppins.variable} ${quicksand.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}
