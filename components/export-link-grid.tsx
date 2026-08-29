import { CategorySection, type LinkItem } from '@/components/category-section'
import { getDisplayCategories } from '@/lib/category-order'

interface ExportLinkGridProps {
  categorized: Record<string, LinkItem[]>
  categories: string[]
}

// Server-rendered grid. Renders every card into the initial HTML so the
// largest contentful paint element is present without waiting on client JS.
// The interactive shell (search/filter/modal) lives in LinkExplorer and
// only ever re-renders this when the user actually filters.
export default function ExportLinkGrid({
  categorized,
  categories,
}: ExportLinkGridProps) {
  return (
    <div className="space-y-16">
      {categories.map((category) => (
        <CategorySection
          key={category}
          category={category}
          links={categorized[category] ?? []}
        />
      ))}
    </div>
  )
}

// Compute the display order once on the server.
export function buildCategories(
  categorized: Record<string, LinkItem[]>
): string[] {
  return getDisplayCategories(categorized)
}
