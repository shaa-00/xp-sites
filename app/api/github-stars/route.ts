// Simple in-memory rate limiter with cleanup
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requests per window
const MAX_PAGES = 10 // Max 1000 repos

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip)
    }
  }
}, 60 * 1000) // Cleanup every minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  record.count++
  return true
}

export async function GET(request: Request) {
  const token = process.env.GITHUB_TOKEN
  const username = process.env.GITHUB_USERNAME

  // Simple IP-based rate limiting (use first IP in chain)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  if (!checkRateLimit(ip)) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  if (!token || !username) {
    console.error('[v0] GitHub credentials not configured')
    return Response.json({ error: 'GitHub credentials not configured' }, { status: 401 })
  }

  try {
    const stars: any[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await fetch(
        `https://api.github.com/users/${username}/starred?per_page=100&page=${page}&sort=stars&direction=desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'XP-Farm',
          },
        }
      )

      if (!response.ok) {
        console.error('[v0] GitHub API error:', response.statusText)
        return Response.json({ error: 'GitHub API error' }, { status: 502 })
      }

      const data = await response.json()

      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false
        break
      }

      data.forEach((repo: any) => {
        stars.push({
          title: repo.name,
          url: repo.html_url,
          description: repo.description || `GitHub repository • ${repo.stargazers_count} stars`,
          language: repo.language || undefined,
          stars: repo.stargazers_count,
          isGitHub: true,
        })
      })

      if (data.length < 100 || page >= MAX_PAGES) {
        hasMore = false
      }

      page += 1
    }

    console.log(`[v0] Fetched ${stars.length} GitHub stars`)
    return Response.json(stars)
  } catch (error) {
    console.error('[v0] Error fetching GitHub stars:', error)
    return Response.json({ error: 'Failed to fetch GitHub stars' }, { status: 500 })
  }
}
