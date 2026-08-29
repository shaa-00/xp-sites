import links from '@/public/links.json'
import starred from '@/public/starred.json'
import LinkExplorer from '@/components/link-explorer'
import ExportLinkGrid, { buildCategories } from '@/components/export-link-grid'

interface LinkItem {
  title: string
  url: string
  description?: string
  isGitHub?: boolean
}

// Merge the two static datasets into one category-keyed map. Links and starred
// repos share categories (they were categorized against the same fixed list), so
// they render together under each category.
function mergeRecords(...records: Record<string, LinkItem[]>[]): Record<string, LinkItem[]> {
  const merged: Record<string, LinkItem[]> = {}
  for (const rec of records) {
    for (const [category, items] of Object.entries(rec)) {
      if (!items.length) continue
      ;(merged[category] ||= []).push(...items)
    }
  }
  return merged
}

export default function Home() {
  // Convert starred repos (name/url/description) into LinkItem shape and merge
  // with links under their shared categories. Both were categorized against the
  // same fixed list, so they render together per category.
  const starredByCategory: Record<string, LinkItem[]> = {}
  for (const [category, items] of Object.entries(
    starred as Record<string, Array<{ name: string; url: string; description?: string }>>
  )) {
    const mapped = items.map((it) => ({
      title: it.name,
      url: it.url,
      description: it.description,
      isGitHub: true,
    }))
    if (mapped.length) starredByCategory[category] = mapped
  }

  const categorized = mergeRecords(
    links as Record<string, LinkItem[]>,
    starredByCategory
  )

  // Build the full grid on the server so the cards are present in the initial
  // HTML (LCP) rather than rendered by client JS after hydration.
  const categories = buildCategories(categorized)

  return (
    <div className="min-h-screen bg-background">
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
