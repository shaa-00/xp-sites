import type { LinkItem } from '@/components/category-section'

// Desired category display order: priority categories first, then the rest
// in their natural order from the JSON, with 'Anime & Art' forced to last.
export const CATEGORY_DISPLAY_ORDER = [
  'AI Tools & Agents',
  'AI Learning & Courses',
  'MCP & Agent Infrastructure',
]

export function getDisplayCategories(
  categorized: Record<string, LinkItem[]>
): string[] {
  const allCats = Object.keys(categorized)
  const priority = CATEGORY_DISPLAY_ORDER.filter((c) => allCats.includes(c))
  const rest = allCats.filter(
    (c) => !CATEGORY_DISPLAY_ORDER.includes(c) && c !== 'Anime & Art'
  )
  const animeLast = allCats.includes('Anime & Art') ? ['Anime & Art'] : []
  return [...priority, ...rest, ...animeLast]
}
