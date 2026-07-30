'use client'

import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface BookmarkData {
  title: string
  url: string
  description?: string
  isGitHub?: boolean
}

interface SearchResult {
  type: 'category' | 'link'
  label: string
  value: string
  icon?: React.ReactNode
}

interface SearchBarProps {
  bookmarks: BookmarkData[]
  categorized: Record<string, BookmarkData[]>
  onFilter: (type: 'category' | 'link', value: string) => void
  onClose: () => void
}

function SearchBar({ bookmarks, categorized, onFilter, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const categories = useMemo(() => Object.keys(categorized), [categorized])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }

    if (isFocused) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isFocused])

  const results = useMemo(() => {
    if (!query.trim()) {
      // Show all categories when empty
      return categories.map(cat => ({
        type: 'category' as const,
        label: cat,
        value: cat,
      }))
    }

    const normalizedQuery = query.toLowerCase().trim()
    const categoryMatches = categories
      .filter(cat => cat.toLowerCase().includes(normalizedQuery))
      .map(cat => ({
        type: 'category' as const,
        label: cat,
        value: cat,
      }))

    const linkMatches = bookmarks
      .filter(link =>
        link.title.toLowerCase().includes(normalizedQuery) ||
        link.description?.toLowerCase().includes(normalizedQuery)
      )
      .map(link => ({
        type: 'link' as const,
        label: link.title,
        value: link.url,
      }))

    return [...categoryMatches, ...linkMatches]
  }, [query, categories, bookmarks, categorized])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => (prev > 0 ? prev - 1 : results.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && results[activeIndex]) {
          handleSelect(results[activeIndex])
        }
        break
      case 'Escape':
        setIsFocused(false)
        break
    }
  }, [results, activeIndex])

  const handleSelect = (result: SearchResult) => {
    onFilter(result.type, result.value)
    setQuery('')
    setActiveIndex(-1)
  }

  const handleDropdownWheel = useCallback((e: WheelEvent) => {
    const dropdownElement = e.currentTarget as HTMLElement
    const isScrollable = dropdownElement.scrollHeight > dropdownElement.clientHeight
    
    if (isScrollable) {
      // Allow scrolling within dropdown
      const scrollTop = dropdownElement.scrollTop
      const scrollHeight = dropdownElement.scrollHeight
      const clientHeight = dropdownElement.clientHeight

      // Prevent page scroll when at top or bottom of dropdown
      if ((scrollTop === 0 && e.deltaY < 0) || (scrollTop + clientHeight >= scrollHeight && e.deltaY > 0)) {
        e.preventDefault()
      }
    } else {
      // Prevent page scroll if dropdown isn't scrollable
      e.preventDefault()
    }
  }, [])

  return (
    <div ref={containerRef} className="sticky top-16 z-30 mb-8 px-4 mt-3">
      <div className="mx-auto max-w-4xl">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search categories or links..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(-1)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            className="w-full rounded-lg border border-border/50 bg-background pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-text"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('')
                setActiveIndex(-1)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Dropdown Results */}
          <AnimatePresence>
            {isFocused && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onWheel={handleDropdownWheel as any}
                className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-white/10 z-40 max-h-96 overflow-y-auto flex flex-col"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
                }}
              >
                <ul className="flex-1">
                  {results.map((result, index) => (
                    <motion.li
                      key={`${result.type}-${result.value}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <button
                        onClick={() => handleSelect(result)}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                          activeIndex === index
                            ? 'bg-primary/10 text-foreground'
                            : 'hover:bg-muted'
                        } ${result.type === 'category' ? 'border-b border-border/30 last:border-b-0' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{result.label}</span>
                            {result.type === 'category' && (
                              <span className="ml-2 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                                Category
                              </span>
                            )}
                          </div>
                          {result.type === 'link' && (
                            <span className="text-xs text-muted-foreground">Link</span>
                          )}
                        </div>
                      </button>
                    </motion.li>
                  ))}
                </ul>
                <div className="border-t border-border/30 px-4 py-2 text-xs text-muted-foreground">
                  <span>↑↓ to navigate • ⏎ to select • ESC to close</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default memo(SearchBar)
