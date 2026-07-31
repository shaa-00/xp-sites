'use client'

import { memo, useState, useEffect } from 'react'
import { ExternalLink, Trash2, GitFork } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useIsClient } from '@/hooks/use-is-client'

interface BookmarkData {
  title: string
  url: string
  description?: string
  isGitHub?: boolean
}

interface CategorySectionProps {
  category: string
  links: BookmarkData[]
  onDelete: (url: string) => void
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  'Design & UI': { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  'AI & ML': { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  'Development': { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
  'Cloud & DevOps': { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  'Learning': { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
  'Art & Creative': { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800' },
  'Tools & Resources': { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
  'VPN & Security': { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  'Entertainment': { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  'Productivity': { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  'Social & Community': { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
}

const getColorForCategory = (category: string) => {
  return categoryColors[category] || {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-800',
  }
}

function CategorySection({ category, links, onDelete }: CategorySectionProps) {
  const isClient = useIsClient()
  const colors = getColorForCategory(category)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-4">
        {/* Category Header */}
        <div className="flex items-center gap-2">
          <div className={`h-1 w-1 rounded-full ${colors.text}`} />
          <h2 className={`text-xl font-semibold ${colors.text}`}>{category}</h2>
          <span className="text-xs text-muted-foreground">({links.length})</span>
        </div>

        {/* Links Grid */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <motion.a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`group relative rounded-lg border ${colors.border} ${colors.bg} p-3 transition-all duration-200 hover:border-opacity-100 hover:bg-opacity-100 hover:shadow-md cursor-pointer`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {link.isGitHub && (
                      <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" title="From GitHub" />
                    )}
                    <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:underline">
                      {link.title}
                    </p>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                    {link.description || (() => { try { return new URL(link.url).hostname } catch { return link.url } })()}
                  </p>
                </div>
                {isClient && <ExternalLink className="h-4 w-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />}
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onDelete(link.url)
                }}
                className="absolute -right-2 -top-2 rounded-full bg-background border border-border p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 cursor-pointer"
                title="Delete link"
              >
                {isClient && <Trash2 className="h-3 w-3 text-red-500" />}
              </button>
            </motion.a>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default memo(CategorySection)
