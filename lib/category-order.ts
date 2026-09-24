import type { LinkItem } from '@/components/category-section'

// Desired category display order: priority categories first, then the rest
// in their natural order from the JSON, with 'Anime & Art' forced to last.
export const CATEGORY_DISPLAY_ORDER = [
  'AI Tools & Agents',
  'AI Learning & Courses',
  'MCP & Agent Infrastructure',
]

const PRIORITY_SET = new Set(CATEGORY_DISPLAY_ORDER)

export function getDisplayCategories(
  categorized: Record<string, LinkItem[]>
): string[] {
  const allCats = Object.keys(categorized)
  const priority = CATEGORY_DISPLAY_ORDER.filter((c) => categorized[c])
  const rest = allCats.filter(
    (c) => !PRIORITY_SET.has(c) && c !== 'Anime & Art'
  )
  const animeLast = categorized['Anime & Art'] ? ['Anime & Art'] : []
  return [...priority, ...rest, ...animeLast]
}

