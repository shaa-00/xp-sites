export async function GET() {
  const token = process.env.GITHUB_TOKEN
  const username = process.env.GITHUB_USERNAME

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
        break
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

      if (data.length < 100) {
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
