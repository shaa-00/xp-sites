import { unstable_cache } from 'next/cache'
import { asc } from 'drizzle-orm'
import type { LinkItem } from '@/components/category-section'
import { db } from './index'
import { categories, items } from './schema'
import { isSafeHttpUrl } from '@/lib/utils'

export const getSiteData = unstable_cache(
  async (): Promise<Record<string, LinkItem[]>> => {
    const [allCategories, allItems] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.order)),
      db.select().from(items),
    ])
    const grouped: Record<string, LinkItem[]> = {}

    for (const category of allCategories) {
      const categoryItems = allItems
        .filter((item) => item.categoryId === category.id && isSafeHttpUrl(item.url))
        .map((item) => ({
          title: item.title,
          url: item.url,
          description: item.description ?? undefined,
          ...(item.source === 'github' ? { isGitHub: true } : {}),
        }))
      if (categoryItems.length) grouped[category.name] = categoryItems
    }

    return grouped
  },
  ['xp-sites-turso-data'],
  { revalidate: 3600, tags: ['site-data'] },
)