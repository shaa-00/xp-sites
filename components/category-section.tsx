import {
  ExternalLink,
  Bot,
  GraduationCap,
  Wrench,
  Plug,
  Palette,
  Sparkles,
  Building2,
  Monitor,
  Terminal,
  BookOpen,
  Shield,
  Rocket,
  Image as ImageIcon,
  LayoutTemplate,
  Brush,
  BookMarked,
  Hammer,
  Server,
  Tag,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface LinkItem {
  title: string
  url: string
  description?: string
  isGitHub?: boolean
}

interface CategorySectionProps {
  category: string
  links: LinkItem[]
}

// Fixed category -> visual mapping. Categories come from a fixed list (see
// scripts/categorize.mjs), so this is a static lookup. Unknown categories fall
// back to a neutral gray style instead of crashing (spec §6.6). Icons are
// monochrome Lucide glyphs that inherit the category accent color (currentColor).
const CATEGORY_STYLES: Record<
  string,
  { bg: string; text: string; border: string; icon: LucideIcon }
> = {
  'AI Tools & Agents': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    icon: Bot,
  },
  'AI Learning & Courses': {
    bg: 'bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800',
    icon: GraduationCap,
  },
  'Developer Tools & Productivity': {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    icon: Wrench,
  },
  'MCP & Agent Infrastructure': {
    bg: 'bg-teal-500/10',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-800',
    icon: Plug,
  },
  'Design Resources': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    icon: Palette,
  },
  'UI Components & Animation': {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800',
    icon: Sparkles,
  },
  'System Design & CS Fundamentals': {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800',
    icon: Building2,
  },
  'Windows Ricing & Customization': {
    bg: 'bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-800',
    icon: Monitor,
  },
  'Linux & Terminal': {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    icon: Terminal,
  },
  'Free Resources & Open Source Lists': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: BookOpen,
  },
  'Privacy & Security': {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    icon: Shield,
  },
  'Learning & Career': {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: Rocket,
  },
  'Wallpapers & Aesthetics': {
    bg: 'bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-200 dark:border-pink-800',
    icon: ImageIcon,
  },
  'Framer & Portfolio Templates': {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    icon: LayoutTemplate,
  },
  'Anime & Art': {
    bg: 'bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
    icon: Brush,
  },
  'AI Skills & Context': {
    bg: 'bg-fuchsia-500/10',
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    border: 'border-fuchsia-200 dark:border-fuchsia-800',
    icon: BookMarked,
  },
  'Utilities & Scripts': {
    bg: 'bg-lime-500/10',
    text: 'text-lime-600 dark:text-lime-400',
    border: 'border-lime-200 dark:border-lime-800',
    icon: Hammer,
  },
  'Self-Hosted & Architecture': {
    bg: 'bg-slate-500/10',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-800',
    icon: Server,
  },
}

const FALLBACK_STYLE = {
  bg: 'bg-gray-500/10',
  text: 'text-gray-600 dark:text-gray-400',
  border: 'border-gray-200 dark:border-gray-800',
  icon: Tag,
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

// Pure server-renderable section. No 'use client', no hooks, no animation
// runtime — the markup ships in the initial HTML so cards are visible
// immediately (LCP) instead of being built by JS after hydration.
export function CategorySection({ category, links }: CategorySectionProps) {
  const colors = CATEGORY_STYLES[category] || FALLBACK_STYLE
  const Icon = colors.icon

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${colors.text}`} />
        <h2 className={`text-xl font-semibold ${colors.text}`}>{category}</h2>
        <span className="text-xs text-muted-foreground">({links.length})</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          // eslint-disable-next-line react/jsx-no-target-blank
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group relative rounded-lg border ${colors.border} ${colors.bg} p-3 transition-all duration-200 hover:border-opacity-100 hover:bg-opacity-100 hover:shadow-md cursor-pointer`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {link.isGitHub && (
                    <div
                      className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0"
                      title="From GitHub"
                    />
                  )}
                  <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:underline">
                    {link.title}
                  </p>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                  {link.description || hostOf(link.url)}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
