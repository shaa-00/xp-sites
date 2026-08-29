'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Bookmark } from 'iconoir-react'
import ExportLinkGrid from '@/components/export-link-grid'
import { type LinkItem } from '@/components/category-section'
import { getDisplayCategories } from '@/lib/category-order'
import SearchBar from '@/components/search-bar'
import { ThemeToggle } from '@/components/theme-toggle'

interface LinkExplorerProps {
  categorized: Record<string, LinkItem[]>
  // Server-rendered full grid passed down from page.tsx. Keeping it in the
  // server tree (not imported here) is what puts the cards in the initial
  // HTML for LCP instead of building them client-side after hydration.
  children?: React.ReactNode
}

function LinkExplorer({ categorized, children }: LinkExplorerProps) {
  const [filteredCategory, setFilteredCategory] = useState<string | null>(null)
  const [filteredLink, setFilteredLink] = useState<string | null>(null)
  const [showFloatingSearch, setShowFloatingSearch] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const bookmarks = useMemo(
    () => Object.values(categorized).flat(),
    [categorized]
  )
  const totalLinks = bookmarks.length

  const handleFilter = (type: 'category' | 'link', value: string) => {
    if (type === 'category') {
      setFilteredCategory(value)
      setFilteredLink(null)
    } else {
      setFilteredLink(value)
      setFilteredCategory(null)
    }
  }

  const clearFilter = () => {
    setFilteredCategory(null)
    setFilteredLink(null)
  }

  const hasFilter = Boolean(filteredCategory || filteredLink)

  const displayed = useMemo(() => {
    if (filteredCategory)
      return { [filteredCategory]: categorized[filteredCategory] || [] }
    if (filteredLink) {
      return Object.entries(categorized).reduce(
        (acc, [cat, items]) => {
          const matches = items.filter((l) => l.url === filteredLink)
          if (matches.length) acc[cat] = matches
          return acc
        },
        {} as Record<string, LinkItem[]>
      )
    }
    return categorized
  }, [filteredCategory, filteredLink, categorized])

  const displayedCategories = useMemo(
    () => getDisplayCategories(displayed),
    [displayed]
  )

  return (
    <>
      <header className="sticky top-0 z-30 px-4 pt-3 sm:px-6">
        <div className={`mx-auto relative flex max-w-4xl items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 px-2.5 py-2 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_28px_rgba(0,0,0,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/50 transition-[max-width,gap] duration-300 ease-out ${scrolled ? 'max-w-2xl gap-1' : 'max-w-4xl gap-3'}`}>
          <a
            href="/"
            className="flex items-center rounded-xl px-1.5 py-0.5 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label="xp-sites home"
          >
            <img
              src="/xp-icon.png"
              alt="xp-sites"
              width={28}
              height={28}
              className="h-7 w-7 rounded-md dark:invert"
            />
          </a>

          <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-base font-semibold tracking-tight text-foreground">
            xp-sites
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowFloatingSearch(true)}
              className="flex items-center gap-2 rounded-xl bg-primary/10 px-2.5 py-2 text-primary transition-colors hover:bg-primary/20 active:scale-[0.98]"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
              <span className="hidden text-xs font-medium sm:inline">Search</span>
            </button>
            <ThemeToggle />
            <span className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:flex">
              <Bookmark className="h-3 w-3" />
              {totalLinks} links
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 mt-12 pb-12 sm:px-6 lg:px-8">
        {(filteredCategory || filteredLink) && (
          <div className="mb-8 flex items-center justify-between rounded-lg border border-border/50 bg-primary/5 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {filteredCategory
                  ? `Viewing: ${filteredCategory}`
                  : 'Search results'}
              </p>
              <p className="text-xs text-muted-foreground">
                {filteredCategory
                  ? `${displayed[filteredCategory]?.length || 0} items`
                  : 'Click result to view'}
              </p>
            </div>
            <button
              onClick={clearFilter}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* No filter: show the server-rendered grid shipped in the initial HTML
            (LCP). When filtering, render a client copy; the markup is identical
            so hydration matches. */}
        {hasFilter ? (
          <>
            <ExportLinkGrid
              categorized={displayed}
              categories={displayedCategories}
            />
            {displayedCategories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No results found</p>
              </div>
            )}
          </>
        ) : (
          children
        )}
      </main>

      {/* Floating search modal — CSS enter animations replace framer-motion.
          Exit is instant (no AnimatePresence); the blur/fade-in on open is
          preserved. */}
      {showFloatingSearch && (
        <div
          className="xp-fade-in fixed inset-0 z-50 backdrop-blur-md flex items-start justify-center pt-24 px-4"
          onClick={() => setShowFloatingSearch(false)}
        >
          <div
            className="xp-modal-in w-full max-w-2xl"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <SearchBar
              bookmarks={bookmarks}
              categorized={categorized}
              onFilter={(type, value) => {
                handleFilter(type, value)
                setShowFloatingSearch(false)
              }}
              onClose={() => setShowFloatingSearch(false)}
              shouldFocusOnMount
            />
          </div>
        </div>
      )}
    </>
  )
}

export default LinkExplorer
