'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LinkManagerProps {
  onAdd: (title: string, url: string) => void
}

export default function LinkManager({ onAdd }: LinkManagerProps) {
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

  const handleSubmit = (e: React.FormEvent) => {
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
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Add New Link</h2>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {isOpen ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add Link
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border/50 bg-card/50 p-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground">
              Link Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., My Awesome Website"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>

          <div>
            <label htmlFor="url" className="block text-sm font-medium text-foreground">
              URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button type="submit" className="w-full">
            Add Link
          </Button>
        </form>
      )}
    </div>
  )
}
