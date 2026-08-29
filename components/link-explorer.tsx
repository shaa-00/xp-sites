'use client'

import { useState, useMemo } from 'react'
import { Search, Bookmark } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ExportLinkGrid from '@/components/export-link-grid'
import { type LinkItem } from '@/components/category-section'
import { getDisplayCategories } from '@/lib/category-order'
import SearchBar from '@/components/search-bar'
import { ThemeToggle } from '@/components/theme-toggle'

// Lucide dropped brand icons, so the GitHub mark is inlined as a monochrome
// glyph that inherits currentColor (matching the rest of the header icons).
function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  )
}

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

  const bookmarks = useMemo(
    () => Object.values(categorized).flat(),
    [categorized]
  )
  const totalLinks = bookmarks.length
  const githubCount = bookmarks.filter((b) => b.isGitHub).length

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
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                XP-Farm
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                A curated collection of resources and inspiration
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFloatingSearch(true)}
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
              <ThemeToggle />
              <div className="flex flex-col items-end text-xs text-muted-foreground leading-tight">
                <span className="flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5" />
                  {totalLinks} links
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <GitHubMark className="w-3.5 h-3.5" />
                  {githubCount} from GitHub
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <SearchBar
        bookmarks={bookmarks}
        categorized={categorized}
        onFilter={handleFilter}
        onClose={clearFilter}
      />

      <main className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
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

      <AnimatePresence>
        {showFloatingSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 backdrop-blur-md flex items-start justify-center pt-24 px-4"
            onClick={() => setShowFloatingSearch(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl"
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
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default LinkExplorer
