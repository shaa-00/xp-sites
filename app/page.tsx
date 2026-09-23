import LinkExplorer from '@/components/link-explorer'
import ExportLinkGrid, { buildCategories } from '@/components/export-link-grid'
import { getSiteData } from '@/lib/db/queries'

export default async function Home() {
  const categorized = await getSiteData()

  // Build the full grid on the server so the cards are present in the initial
  // HTML (LCP) rather than rendered by client JS after hydration.
  const categories = buildCategories(categorized)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'XP-Farm | Curated Developer & AI Links',
    description:
      'A curated collection of developer tools, AI agents, MCP resources, and open-source bookmarks.',
    url: 'https://xp-sites.vercel.app/',
    isPartOf: {
      '@type': 'WebSite',
      name: 'XP-Farm',
      url: 'https://xp-sites.vercel.app/',
    },
  }

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json">
        {JSON.stringify(structuredData).replace(/</g, '\\u003c')}
      </script>
      <LinkExplorer categorized={categorized}>
        <ExportLinkGrid categorized={categorized} categories={categories} />
      </LinkExplorer>

      <footer className="border-t border-border/50 bg-background py-8">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs text-muted-foreground">
            Built with Next.js, Tailwind CSS, and ❤️
          </p>
        </div>
      </footer>
    </div>
  )
}
