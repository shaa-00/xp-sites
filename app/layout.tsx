import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, DM_Sans } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'XP-Farm | Curated Developer & AI Links',
  description: 'A minimalist collection of curated developer tools, AI agents, MCP resources, and open-source bookmarks.',
  metadataBase: new URL('https://xp-sites.vercel.app'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'XP-Farm | Curated Developer & AI Links',
    description: 'A minimalist collection of curated developer tools, AI agents, MCP resources, and open-source bookmarks.',
    url: 'https://xp-sites.vercel.app',
    siteName: 'XP-Farm',
    locale: 'en_US',
    type: 'website',
    images: [{
      url: '/opengraph-image',
      width: 1200,
      height: 630,
      alt: 'XP-Farm curated developer and AI links',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XP-Farm | Curated Developer & AI Links',
    description: 'A minimalist collection of curated developer tools, AI agents, MCP resources, and open-source bookmarks.',
    images: ['/opengraph-image'],
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
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
    <html lang="en" className={`bg-background ${spaceGrotesk.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}
