'use client'

import { memo, useState, useCallback, useMemo, useEffect, useRef, useDeferredValue } from 'react'
import { Search, X } from 'iconoir-react'

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
  shouldFocusOnMount?: boolean
}

function SearchBar({ bookmarks, categorized, onFilter, onClose, shouldFocusOnMount = false }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the input when this SearchBar is opened as a floating modal
  // so the user can start typing immediately without an extra click.
  useEffect(() => {
    if (shouldFocusOnMount) {
      inputRef.current?.focus()
    }
  }, [shouldFocusOnMount])

  // Defer the expensive filter so typing stays responsive (protects INP).
  // The input value updates immediately; the results recompute on a lower
  // priority pass. When the list grows large this keeps keystrokes smooth.
  const deferredQuery = useDeferredValue(query)

  const categories = useMemo(() => Object.keys(categorized), [categorized])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const results = useMemo(() => {
    // Empty state is computed when deferredQuery is empty so clearing the input
    // snaps back to all categories; filtering uses the deferred query to avoid blocking main thread.
    if (!deferredQuery.trim()) {
      return categories.map(cat => ({
        type: 'category' as const,
        label: cat,
        value: cat,
      }))
    }

    const normalizedQuery = deferredQuery.toLowerCase().trim()
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
        (typeof link.description === 'string' && link.description.toLowerCase().includes(normalizedQuery))
      )
      .map(link => ({
        type: 'link' as const,
        label: link.title,
        value: link.url,
      }))

    return [...categoryMatches, ...linkMatches]
  }, [deferredQuery, categories, bookmarks])

  const handleSelect = useCallback((result: SearchResult) => {
    onFilter(result.type, result.value)
    setQuery('')
    setActiveIndex(-1)
    setIsFocused(false)
  }, [onFilter])

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
  }, [results, activeIndex, handleSelect])

  const handleDropdownWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleContainerWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (isFocused) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [isFocused])

  return (
    <div ref={containerRef} className="sticky top-[80px] z-20 mb-8 px-4 mt-3" onWheel={handleContainerWheel}>
      <div className="mx-auto max-w-4xl">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>
          <input
            ref={inputRef}
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
          {query ? (
            <button
              onClick={() => {
                setQuery('')
                setActiveIndex(-1)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}

          {/* Dropdown Results — CSS enter animation replaces framer-motion */}
          {isFocused && results.length > 0 ? (
            <div
              onWheel={handleDropdownWheel}
              className="xp-dropdown-in absolute top-full left-0 right-0 mt-2 rounded-xl border border-white/20 z-50 max-h-52 overflow-y-auto flex flex-col"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
              }}
            >
              <ul className="flex-1">
                {results.map((result, index) => (
                  <li
                    key={`${result.type}-${result.value}`}
                    className={`xp-item-in w-full text-left text-sm transition-colors ${
                      result.type === 'category' ? 'border-b border-border/30 last:border-b-0' : ''
                    }`}
                    style={{ animationDelay: `${index * 0.02}s` }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(result)}
                      className={`w-full px-4 py-2.5 text-left cursor-pointer transition-colors ${
                        activeIndex === index
                          ? 'bg-primary/10 text-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{result.label}</span>
                          {result.type === 'category' ? (
                            <span className="ml-2 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                              Category
                            </span>
                          ) : null}
                        </div>
                        {result.type === 'link' ? (
                          <span className="text-xs text-muted-foreground">Link</span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border/30 px-4 py-2 text-xs text-muted-foreground">
                <span>↑↓ to navigate • ⏎ to select • ESC to close</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default memo(SearchBar)
