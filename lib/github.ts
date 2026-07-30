export interface GitHubStar {
  title: string
  url: string
  description?: string
  language?: string
  stars: number
  isGitHub: true
}

export async function fetchGitHubStars(): Promise<GitHubStar[]> {
  try {
    const response = await fetch('/api/github-stars', {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('[v0] GitHub API error:', response.statusText)
      return []
    }

    const data = await response.json()

    if (data.error) {
      console.warn('[v0] GitHub fetch error:', data.error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('[v0] Error fetching GitHub stars:', error)
    return []
  }
}
