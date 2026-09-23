// Local pipeline: Firefox bookmarks + GitHub stars -> categorized Turso rows.
// Run locally only (needs GEMINI_API_KEY / GITHUB_TOKEN / Turso credentials).
//   node scripts/categorize.mjs [path/to/bookmarks.json]
import { readFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  closeDatabase,
  createDatabaseClient,
  ensureDatabase,
  getItems,
  insertItem,
} from './db.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// Fixed, closed category list. Edit here + re-run to add/rename a category.
export const CATEGORIES = [
  'AI Tools & Agents',
  'AI Learning & Courses',
  'Developer Tools & Productivity',
  'MCP & Agent Infrastructure',
  'Design Resources',
  'UI Components & Animation',
  'System Design & CS Fundamentals',
  'Windows Ricing & Customization',
  'Linux & Terminal',
  'Free Resources & Open Source Lists',
  'Privacy & Security',
  'Learning & Career',
  'Wallpapers & Aesthetics',
  'Framer & Portfolio Templates',
  'Anime & Art',
  'AI Skills & Context',
  'Utilities & Scripts',
  'Self-Hosted & Architecture',
]

const CATEGORY_SET = new Set(CATEGORIES)

// Denylist: junk that must never reach the categorizer or the site.
const SKIP_URLS = [
  /console\.cloud\.google\.com/,
  /drive\.google\.com/,
  /\.googleusercontent\.com/,
  /github\.com\/some-friend/,
  /\/pricing\b/,
  /\/plans\b/,
  /\/plans-pricing/,
  /[?&](aff_id|aff_c|friend|aid|chan)=/,
  /dpbolvw\.net/,
  /go\.getproton\.me/,
  /windscribe\.com[?&]affid/,
  /privadovpn\.com/,
  /hide\.me[?&]friend/,
]

export function parseFirefoxBookmarks(node) {
  if (!node || typeof node !== 'object') return []
  if (node.type === 'text/x-moz-place') {
    const url = node.uri
    if (!url) return []
    return [{ title: node.title || url, url }]
  }
  if (Array.isArray(node.children)) {
    return node.children.flatMap((c) => parseFirefoxBookmarks(c))
  }
  return []
}

export function filterNoise(links) {
  return links.filter((l) => !SKIP_URLS.some((re) => re.test(l.url)))
}

export function mapStarredRepos(repos) {
  return repos.map((r) => ({
    name: r.full_name || r.name,
    url: r.html_url,
    description: r.description || '',
    stars: r.stargazers_count ?? 0,
    language: r.language ?? null,
    topics: Array.isArray(r.topics) ? r.topics : [],
  }))
}

export function normalizeCategory(name) {
  if (!CATEGORY_SET.has(name)) {
    throw new Error(`Invalid category returned by Gemini: ${JSON.stringify(name)}`)
  }
  return name
}

// Combine links + starred, batch by `batchSize`, and require one valid category
// per item. Invalid or incomplete model output aborts the run before writes.
export async function assignCategories(links, starred, { batchSize = 40, callGemini }) {
  const items = [
    ...links.map((it) => ({ kind: 'link', ...it })),
    ...starred.map((it) => ({ kind: 'star', ...it })),
  ]
  const out = {}
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const cats = await callGemini(batch)
    if (!Array.isArray(cats) || cats.length !== batch.length) {
      throw new Error(`Gemini returned ${cats?.length ?? 0} categories for ${batch.length} items`)
    }
    for (let j = 0; j < batch.length; j++) {
      const cat = normalizeCategory(cats[j])
        ; (out[cat] ||= []).push(batch[j])
    }
  }
  return out
}


// --- local-only IO used only by the CLI entrypoint ---

export async function loadEnvLocal() {
  const envPath = resolve(ROOT, '.env.local')
  try {
    const text = (await readFile(envPath, 'utf8')).toString()
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (!(key in process.env)) process.env[key] = val
    }
  } catch {
    // .env.local optional; keys may already be in the environment.
  }
}

async function fetchGitHubStars(username) {
  const token = process.env.GITHUB_TOKEN
  const headers = { 'User-Agent': 'xp-sites-categorize', Accept: 'application/vnd.github+json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const encodedUsername = encodeURIComponent(username.trim())
  const stars = []
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `https://api.github.com/users/${encodedUsername}/starred?per_page=100&page=${page}&sort=created&direction=desc`,
      { headers },
    )
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) break
    stars.push(...data)
    if (data.length < 100) break
  }
  return stars
}

export function makeGeminiCaller() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('Missing required environment variable: GEMINI_API_KEY')
  const model = 'gemini-3.5-flash-lite'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const list = CATEGORIES.map((c) => `- ${c}`).join('\n')

  return async function callGemini(batch) {
    const itemsText = batch
      .map((it, i) => `${i + 1}. ${it.title || it.name || ''} — ${it.url}`)
      .join('\n')
    const prompt = `Categorize each item into EXACTLY ONE category, copied character-for-character from this fixed list:\n${list}\n\nReturn ONLY a JSON array of exactly ${batch.length} strings, in the same order as the items. Every string must match the fixed list. Do not return markdown, explanations, null, or an empty array.\n\nItems:\n${itemsText}`
    let lastError

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, responseMimeType: 'application/json' },
          }),
        })
        if (!res.ok) throw new Error(`Gemini ${res.status}`)
        const data = await res.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        const cats = JSON.parse(text?.replace(/^```(?:json)?|```$/gim, '').trim() || 'null')
        if (!Array.isArray(cats) || cats.length !== batch.length) {
          throw new Error(`expected ${batch.length} categories, received ${Array.isArray(cats) ? cats.length : 'non-array output'}`)
        }
        cats.forEach(normalizeCategory)
        return cats
      } catch (err) {
        lastError = err
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
        }
      }
    }

    throw new Error(`Gemini could not categorize batch after 3 attempts: ${lastError.message}`)
  }
}

export function splitByKind(categorized) {
  const links = {}
  const starred = {}
  for (const [cat, items] of Object.entries(categorized)) {
    for (const it of items) {
      const { kind, ...rest } = it
      const target = kind === 'star' ? starred : links
        ; (target[cat] ||= []).push(rest)
    }
  }
  return { links, starred }
}

async function main() {
  await loadEnvLocal()
  const client = createDatabaseClient()
  const bookmarkArg = process.argv[2]

  let links = []
  if (bookmarkArg) {
    const raw = JSON.parse(await readFile(resolve(ROOT, bookmarkArg), 'utf8'))
    links = filterNoise(parseFirefoxBookmarks(raw))
    console.log(`[categorize] parsed ${links.length} bookmarks (after noise filter)`)
  } else {
    console.log('[categorize] no bookmarks file given; bookmark input is empty')
  }

  let starred = []
  try {
    const repos = await fetchGitHubStars(process.env.GITHUB_USERNAME || 'shaa-00')
    starred = mapStarredRepos(repos)
    console.log(`[categorize] fetched ${starred.length} GitHub stars`)
  } catch (err) {
    console.warn(`[categorize] GitHub fetch failed: ${err.message}; GitHub input is empty`)
  }

  await ensureDatabase(client)
  const cachedItems = await getItems(client)
  const cachedByUrl = new Map(cachedItems.map((item) => [item.url, item]))

  // Bookmark records win URL collisions. A GitHub row can be replaced only
  // when the same URL appears in the current bookmark input.
  const newLinks = links.filter((link) => {
    const cached = cachedByUrl.get(link.url)
    return !cached || cached.source === 'github'
  })
  const newStars = starred.filter((star) => !cachedByUrl.has(star.url))

  if (newLinks.length || newStars.length) {
    console.log(`[categorize] ${newLinks.length} new bookmark(s), ${newStars.length} new star(s) to classify`)
    const categorized = await assignCategories(newLinks, newStars, {
      batchSize: 40,
      callGemini: makeGeminiCaller(),
    })
    const { links: newLinkRec, starred: newStarRec } = splitByKind(categorized)
    for (const [category, records] of Object.entries(newLinkRec)) {
      for (const record of records) {
        await insertItem(client, { ...record, category, source: 'bookmark' }, { overwrite: true })
      }
    }
    for (const [category, records] of Object.entries(newStarRec)) {
      for (const record of records) {
        await insertItem(client, {
          ...record,
          title: record.name,
          category,
          source: 'github',
        })
      }
    }
    console.log(`[categorize] inserted ${newLinks.length + newStars.length} newly classified item(s)`)
  } else {
    console.log('[categorize] nothing new to classify; database unchanged')
  }

  closeDatabase(client)
}

// Run only when invoked directly, not when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
