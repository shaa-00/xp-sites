'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import Lenis from 'lenis'
import { RefreshCw, GitFork, Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { categorizeLinks } from '@/lib/categorize'
import { initialBookmarks } from '@/lib/bookmarks'
import { fetchGitHubStars, type GitHubStar } from '@/lib/github'
import FloatingLinkManager from '@/components/floating-link-manager'
import CategorySection from '@/components/category-section'
import SearchBar from '@/components/search-bar'
import { ThemeToggle } from '@/components/theme-toggle'
import { useIsClient } from '@/hooks/use-is-client'

function starToBookmark(star: GitHubStar) {
  return {
    title: star.title,
    url: star.url,
    description: star.description,
    isGitHub: true as const,
  }
}

export default function Home() {
  const [bookmarks, setBookmarks] = useState(initialBookmarks)
  const [categorized, setCategorized] = useState(() => categorizeLinks(initialBookmarks))
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filteredCategory, setFilteredCategory] = useState<string | null>(null)
  const [filteredLink, setFilteredLink] = useState<string | null>(null)
  const isClient = useIsClient()
  const [showSearchIcon, setShowSearchIcon] = useState(false)
  const [showFloatingSearch, setShowFloatingSearch] = useState(false)
  const searchBarRef = useRef<HTMLDivElement>(null)

  // Scroll detection for search icon
  useEffect(() => {
    let mounted = true
    const handleScroll = () => {
      if (mounted && searchBarRef.current) {
        const rect = searchBarRef.current.getBoundingClientRect()
        setShowSearchIcon(rect.bottom < window.innerHeight * 0.8)
      }
    }

    const initialCheck = () => {
      requestAnimationFrame(handleScroll)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    initialCheck()
    return () => {
      mounted = false
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Fetch GitHub stars on mount
  useEffect(() => {
    const loadGitHubStars = async () => {
      try {
        const stars = await fetchGitHubStars()
        if (stars.length > 0) {
          const updated = [...initialBookmarks, ...stars.map(starToBookmark)]
          setBookmarks(updated)
          setCategorized(categorizeLinks(updated))
        }
      } catch (error) {
        console.error('[v0] Failed to fetch GitHub stars:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadGitHubStars()
  }, [])

  useEffect(() => {
    // Initialize Lenis for smooth scrolling
    const lenis = new Lenis()

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    const animationFrameId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(animationFrameId)
      lenis.destroy()
    }
  }, [])

  const handleAddBookmark = (title: string, url: string) => {
    const newBookmark = { title, url }
    const updated = [...bookmarks, newBookmark]
    setBookmarks(updated)
    setCategorized(categorizeLinks(updated))
  }

  const handleDeleteBookmark = (url: string) => {
    const updated = bookmarks.filter((b) => b.url !== url)
    setBookmarks(updated)
    setCategorized(categorizeLinks(updated))
  }

  const handleRefreshGitHub = async () => {
    setIsRefreshing(true)
    try {
      const stars = await fetchGitHubStars()
      if (stars.length > 0) {
        // Filter out existing GitHub stars and add new ones
        const nonGitHubBookmarks = bookmarks.filter(b => !b.isGitHub)
        const updated = [...nonGitHubBookmarks, ...stars.map(starToBookmark)]
        setBookmarks(updated)
        setCategorized(categorizeLinks(updated))
      }
    } catch (error) {
      console.error('[v0] Failed to refresh GitHub stars:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleFilter = (type: 'category' | 'link', value: string) => {
    if (type === 'category') {
      setFilteredCategory(value)
      setFilteredLink(null)
    } else {
      setFilteredLink(value)
      setFilteredCategory(null)
    }
  }

  const displayedCategories = useMemo(() => {
    if (filteredCategory) {
      return { [filteredCategory]: categorized[filteredCategory] || [] }
    }
    if (filteredLink) {
      return Object.entries(categorized).reduce((acc, [cat, links]) => {
        const filtered = links.filter(link => link.url === filteredLink)
        if (filtered.length > 0) {
          acc[cat] = filtered
        }
        return acc
      }, {} as Record<string, typeof bookmarks>)
    }
    return categorized
  }, [filteredCategory, filteredLink, categorized])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">XP-Farm</h1>
              <p className="mt-1 text-sm text-muted-foreground">A curated collection of resources and inspiration</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFloatingSearch(true)}
                className={`p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors ${showSearchIcon ? 'flex' : 'hidden'}`}
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
              <ThemeToggle />
              {isClient && (
                <button
                  onClick={handleRefreshGitHub}
                  disabled={isRefreshing}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
                  title="Refresh GitHub stars"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Syncing...' : 'Sync Stars'}
                </button>
              )}
              <div className="text-xs text-muted-foreground text-right">
                <p>{bookmarks.length} links</p>
                <p className="text-xs text-muted-foreground/70">{bookmarks.filter(b => b.isGitHub).length} from GitHub</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div ref={searchBarRef}>
        <SearchBar
          bookmarks={bookmarks}
          categorized={categorized}
          onFilter={handleFilter}
          onClose={() => {
            setFilteredCategory(null)
            setFilteredLink(null)
          }}
        />
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
        {/* Filter Info */}
        {(filteredCategory || filteredLink) && (
          <div className="mb-8 flex items-center justify-between rounded-lg border border-border/50 bg-primary/5 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {filteredCategory ? `Viewing: ${filteredCategory}` : 'Search results'}
              </p>
              <p className="text-xs text-muted-foreground">
                {filteredCategory ? `${displayedCategories[filteredCategory]?.length || 0} items` : 'Click result to view'}
              </p>
            </div>
            <button
              onClick={() => {
                setFilteredCategory(null)
                setFilteredLink(null)
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Categories */}
        <div className="space-y-16">
          {Object.entries(displayedCategories).map(([category, links]) => (
            <CategorySection
              key={category}
              category={category}
              links={links}
              onDelete={handleDeleteBookmark}
            />
          ))}
        </div>

        {/* Empty State */}
        {Object.keys(displayedCategories).length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No results found</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background py-8">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs text-muted-foreground">
            Built with Next.js, Tailwind CSS, Lenis, and ❤️
          </p>
        </div>
      </footer>

      {/* Floating Search Overlay */}
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

      {/* Floating Link Manager */}
      <FloatingLinkManager onAdd={handleAddBookmark} />
    </div>
  )
}
