'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search } from 'iconoir-react'
import ExportLinkGrid from '@/components/export-link-grid'
import { type LinkItem } from '@/components/category-section'
import { getDisplayCategories } from '@/lib/category-order'
import SearchBar from '@/components/search-bar'
import { ThemeToggle } from '@/components/theme-toggle'
import { CategoryRail } from '@/components/category-rail'

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
    const onScroll = () => {
      const next = window.scrollY > 16
      setScrolled((prev) => (prev === next ? prev : next))
    }
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
        <div className={`mx-auto relative flex items-center justify-between gap-2 rounded-2xl border border-border/60 px-2.5 py-2 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_28px_rgba(0,0,0,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/50 transition-[max-width,background-color] duration-300 ease-out motion-reduce:transition-none ${scrolled ? 'max-w-3xl bg-background/80' : 'max-w-4xl bg-background/70'}`}>
          <a
            href="/"
            className="flex shrink-0 items-center rounded-xl px-1.5 py-0.5 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label="XP-Farm home"
          >
            <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">XP</span>
          </a>

          <h1 className="min-w-0 flex-1 truncate text-center text-sm font-semibold tracking-tight text-foreground sm:text-base">
            XP-Farm
          </h1>

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
            <span className="hidden shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40 px-2 py-1 text-center text-[11px] font-medium text-muted-foreground sm:flex">
              {totalLinks} links
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-4xl px-4 pb-12 sm:mt-12 sm:px-6 lg:px-8">
        <CategoryRail
          categories={getDisplayCategories(categorized)}
          categorized={categorized}
          activeCategory={filteredCategory}
          onSelect={(category) => {
            setFilteredCategory(category)
            setFilteredLink(null)
          }}
        />

        {(filteredCategory || filteredLink) && (
          <div className="mb-10 flex items-center justify-between gap-4 border-b border-border/60 py-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {filteredCategory
                  ? filteredCategory
                  : 'Search results'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {filteredCategory
                  ? `${displayed[filteredCategory]?.length || 0} items`
                  : 'Click result to view'}
              </p>
            </div>
            <button
              onClick={clearFilter}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
