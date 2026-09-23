'use client'

import { useEffect, useRef } from 'react'
import {
  Bookmark,
  Cpu as Bot,
  DesignNib as Brush,
  Building,
  Computer,
  GraduationCap,
  Hammer,
  MediaImage as ImageIcon,
  OpenBook,
  Palette,
  PlugTypeC,
  Rocket,
  Server,
  Shield,
  Sparks,
  Pin as Tag,
  Terminal,
  ViewGrid,
  Wrench,
} from 'iconoir-react'

import type { LinkItem } from '@/components/category-section'

interface CategoryRailProps {
  categories: string[]
  categorized: Record<string, LinkItem[]>
  activeCategory: string | null
  onSelect: (category: string | null) => void
}

const CATEGORY_ICONS: Record<string, typeof Tag> = {
  'AI Tools & Agents': Bot,
  'AI Learning & Courses': GraduationCap,
  'Developer Tools & Productivity': Wrench,
  'MCP & Agent Infrastructure': PlugTypeC,
  'Design Resources': Palette,
  'UI Components & Animation': Sparks,
  'System Design & CS Fundamentals': Building,
  'Windows Ricing & Customization': Computer,
  'Linux & Terminal': Terminal,
  'Free Resources & Open Source Lists': OpenBook,
  'Privacy & Security': Shield,
  'Learning & Career': Rocket,
  'Wallpapers & Aesthetics': ImageIcon,
  'Framer & Portfolio Templates': ViewGrid,
  'Anime & Art': Brush,
  'AI Skills & Context': Bookmark,
  'Utilities & Scripts': Hammer,
  'Self-Hosted & Architecture': Server,
}

export function CategoryRail({
  categories,
  categorized,
  activeCategory,
  onSelect,
}: CategoryRailProps) {
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || !rail.scrollWidth || !event.deltaY) return

      event.preventDefault()
      event.stopPropagation()
      rail.scrollLeft += event.deltaY
    }

    rail.addEventListener('wheel', handleWheel, { passive: false })
    return () => rail.removeEventListener('wheel', handleWheel)
  }, [])

  return (
    <nav aria-label="Filter by category" className="border-y border-border/60 py-2">
      <div
        ref={railRef}
        className="xp-category-rail -mx-1 flex w-full min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain px-1 pb-0 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={activeCategory === null}
          className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
            activeCategory === null
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>All links</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
              activeCategory === null ? 'bg-primary-foreground/15' : 'bg-muted-foreground/10'
            }`}
          >
            {Object.values(categorized).flat().length}
          </span>
        </button>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category] || Tag
          const isActive = activeCategory === category

          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelect(category)}
              aria-pressed={isActive}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                isActive
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{category}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {categorized[category]?.length || 0}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}