'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Classic } from './Classic'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Classic
      toggled={resolvedTheme === 'dark'}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="rounded-xl bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
    />
  )
}
