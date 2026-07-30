'use client'

import { motion } from 'framer-motion'
import { ExternalLink, GitFork } from 'lucide-react'
import { useState } from 'react'

interface GitHubLinkProps {
  title: string
  url: string
  onDelete?: (url: string) => void
}

export default function GitHubLink({ title, url, onDelete }: GitHubLinkProps) {
  const [isHovering, setIsHovering] = useState(false)

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="group flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/50 p-3 transition-all duration-200 hover:bg-card hover:border-border"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <GitFork className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-sm text-foreground hover:text-primary transition-colors"
          title={title}
        >
          {title}
        </a>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isHovering && onDelete && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.preventDefault()
              onDelete(url)
            }}
            className="text-xs px-2 py-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
          >
            Delete
          </motion.button>
        )}
        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  )
}
