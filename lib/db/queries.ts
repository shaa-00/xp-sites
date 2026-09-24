import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { asc } from 'drizzle-orm'
import type { LinkItem } from '@/components/category-section'
import { db } from './index'
import { categories, items } from './schema'
import { isSafeHttpUrl } from '@/lib/utils'

export const getSiteData = cache(
  unstable_cache(
    async (): Promise<Record<string, LinkItem[]>> => {
      const [allCategories, allItems] = await Promise.all([
        db.select().from(categories).orderBy(asc(categories.order)),
        db.select().from(items),
      ])

      // O(I) single pass to index items by categoryId (js-index-maps)
      const itemsByCategoryId = new Map<string, LinkItem[]>()
      for (const item of allItems) {
        if (!isSafeHttpUrl(item.url)) continue
        const categoryItems = itemsByCategoryId.get(item.categoryId) || []
        categoryItems.push({
          title: item.title,
          url: item.url,
          description: item.description ?? undefined,
          ...(item.source === 'github' ? { isGitHub: true } : {}),
        })
        itemsByCategoryId.set(item.categoryId, categoryItems)
      }

      // O(C) map over categories
      const grouped: Record<string, LinkItem[]> = {}
      for (const category of allCategories) {
        const categoryItems = itemsByCategoryId.get(category.id)
        if (categoryItems && categoryItems.length > 0) {
          grouped[category.name] = categoryItems
        }
      }

      return grouped
    },
    ['xp-sites-turso-data'],
    { revalidate: 3600, tags: ['site-data'] },
  ),
)