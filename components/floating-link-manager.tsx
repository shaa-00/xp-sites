'use client'

import { memo, useState, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface FloatingLinkManagerProps {
  onAdd: (title: string, url: string) => void
}

function FloatingLinkManager({ onAdd }: FloatingLinkManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const validateUrl = (urlString: string): boolean => {
    try {
      new URL(urlString)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!url.trim()) {
      setError('URL is required')
      return
    }

    if (!validateUrl(url)) {
      setError('Please enter a valid URL')
      return
    }

    onAdd(title.trim(), url.trim())
    setTitle('')
    setUrl('')
    setIsOpen(false)
  }, [title, url, onAdd])

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-40 p-3 rounded-full transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
        }}
        animate={{
          boxShadow: isOpen 
            ? '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 0 20px rgba(255, 255, 255, 0.3)'
            : '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
        }}
        transition={{ duration: 0.3 }}
        aria-label="Add new link"
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
        >
          {isOpen ? (
            <X className="h-5 w-5 text-foreground" />
          ) : (
            <Plus className="h-5 w-5 text-foreground" />
          )}
        </motion.div>
      </motion.button>

      {/* Floating Form Panel */}
      {isOpen && (
        <motion.div
          className="fixed bottom-20 left-6 z-40 w-80 rounded-2xl p-6 shadow-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          }}
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 20 }}
          transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Add New Link</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="floating-title" className="block text-xs font-medium text-muted-foreground mb-1">
                Title
              </label>
              <input
                id="floating-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Link title"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            <div>
              <label htmlFor="floating-url" className="block text-xs font-medium text-muted-foreground mb-1">
                URL
              </label>
              <input
                id="floating-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <Button type="submit" className="w-full h-8 text-xs">
              Add Link
            </Button>
          </form>
        </motion.div>
      )}

      {/* Backdrop overlay when form is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}

export default memo(FloatingLinkManager)
