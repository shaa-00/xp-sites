// Offline pipeline: Firefox bookmarks + GitHub stars -> categorized static JSON.
// Run locally only (needs GEMINI_API_KEY / GITHUB_TOKEN from .env.local). Never deployed.
//   node scripts/categorize.mjs [path/to/bookmarks.json]
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

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

export const FALLBACK_CATEGORY = 'Free Resources & Open Source Lists'

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

// Guard against category drift: any name not in the fixed list -> fallback.
export function normalizeCategory(name) {
  return CATEGORY_SET.has(name) ? name : FALLBACK_CATEGORY
}

// Combine links + starred, batch by `batchSize`, ask callGemini for one category
// per item, normalize every result. Returns Record<category, items[]> (no empties).
export async function assignCategories(links, starred, { batchSize = 40, callGemini }) {
  const items = [
    ...links.map((it) => ({ kind: 'link', ...it })),
    ...starred.map((it) => ({ kind: 'star', ...it })),
  ]
  const out = {}
  let driftCount = 0
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const cats = await callGemini(batch)
    for (let j = 0; j < batch.length; j++) {
      const rawCat = cats[j]
      const cat = normalizeCategory(rawCat)
      if (cat === FALLBACK_CATEGORY && rawCat !== FALLBACK_CATEGORY) {
        driftCount++
      }
      ;(out[cat] ||= []).push(batch[j])
    }
  }
  if (driftCount > 0) {
    console.warn(`[categorize] ${driftCount} item(s) rerouted to fallback category (Gemini drift detected)`)
  }
  out.driftCount = driftCount
  return out
}


export function mergeRecords(...records) {
  const merged = {}
  for (const rec of records) {
    for (const [cat, items] of Object.entries(rec)) {
      if (items.length === 0) continue
      ;(merged[cat] ||= []).push(...items)
    }
  }
  return merged
}

// Flatten a Record<category, items[]> into a url -> item map, so we can tell
// which URLs we've already classified (cached in the committed JSON).
export function flattenRecord(record) {
  const flat = new Map()
  for (const items of Object.values(record)) {
    for (const it of items) flat.set(it.url, it)
  }
  return flat
}

// Keep only cached items whose URL is still present in the new input. Items
// whose URL was removed from the bookmarks/GitHub set drop out automatically.
export function knownByCategory(record, presentUrls) {
  const known = {}
  for (const [cat, items] of Object.entries(record)) {
    const kept = items.filter((it) => presentUrls.has(it.url))
    if (kept.length) known[cat] = kept
  }
  return known
}

async function loadJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return {}
  }
}

export async function writeOutputs(dir, links, starred) {
  await writeFile(resolve(dir, 'links.json'), JSON.stringify(links, null, 2))
  await writeFile(resolve(dir, 'starred.json'), JSON.stringify(starred, null, 2))
}

// --- local-only IO used only by the CLI entrypoint ---

async function loadEnvLocal() {
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
  const stars = []
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `https://api.github.com/users/${username}/starred?per_page=100&page=${page}&sort=created&direction=desc`,
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

function makeGeminiCaller() {
  const key = process.env.GEMINI_API_KEY
  const model = 'gemini-3.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
  const list = CATEGORIES.map((c) => `- ${c}`).join('\n')

  return async function callGemini(batch) {
    const itemsText = batch
      .map((it, i) => `${i + 1}. ${it.title || it.name || ''} — ${it.url}`)
      .join('\n')
    const prompt = `Categorize each item into EXACTLY ONE category, copied verbatim from this fixed list:\n${list}\n\nReturn a JSON array of category strings, one per item, in the same order as the items. No markdown, no commentary.\n\nItems:\n${itemsText}`

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      })
      if (!res.ok) throw new Error(`Gemini ${res.status}`)
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
      const raw = JSON.parse(text.replace(/^```(?:json)?|```$/gim, '').trim())
      const cats = Array.isArray(raw) ? raw : []
      return batch.map((_, i) => cats[i] ?? FALLBACK_CATEGORY)
    } catch (err) {
      console.warn(`[categorize] Gemini batch failed (${err.message}); using fallback for ${batch.length} items`)
      return batch.map(() => FALLBACK_CATEGORY)
    }
  }
}

export function splitByKind(categorized) {
  const links = {}
  const starred = {}
  for (const [cat, items] of Object.entries(categorized)) {
    for (const it of items) {
      const { kind, ...rest } = it
      const target = kind === 'star' ? starred : links
      ;(target[cat] ||= []).push(rest)
    }
  }
  return { links, starred }
}

async function main() {
  await loadEnvLocal()
  const pubDir = resolve(ROOT, 'public')
  const bookmarkArg = process.argv[2]

  let links = []
  if (bookmarkArg) {
    const raw = JSON.parse(await readFile(resolve(ROOT, bookmarkArg), 'utf8'))
    links = filterNoise(parseFirefoxBookmarks(raw))
    console.log(`[categorize] parsed ${links.length} bookmarks (after noise filter)`)
  } else {
    console.log('[categorize] no bookmarks file given; links.json will be empty')
  }

  let starred = []
  try {
    const repos = await fetchGitHubStars(process.env.GITHUB_USERNAME || 'shaa-00')
    starred = mapStarredRepos(repos)
    console.log(`[categorize] fetched ${starred.length} GitHub stars`)
  } catch (err) {
    console.warn(`[categorize] GitHub fetch failed: ${err.message}; starred.json will be empty`)
  }

  // Cache: reuse categories already committed in public/*.json so we never
  // re-send a known URL to Gemini (saves cost + prevents drift). Only brand-new
  // URLs are classified; previously-categorized items are always preserved.
  const cachedLinks = await loadJson(resolve(pubDir, 'links.json'))
  const cachedStarred = await loadJson(resolve(pubDir, 'starred.json'))
  const knownLinks = flattenRecord(cachedLinks)
  const knownStars = flattenRecord(cachedStarred)

  const newLinks = links.filter((l) => !knownLinks.has(l.url))
  const newStars = starred.filter((s) => !knownStars.has(s.url))

  if (newLinks.length || newStars.length) {
    console.log(`[categorize] ${newLinks.length} new bookmark(s), ${newStars.length} new star(s) to classify`)
    const categorized = await assignCategories(newLinks, newStars, {
      batchSize: 40,
      callGemini: makeGeminiCaller(),
    })
    // Strip the metadata key before splitting into links/starred records,
    // so splitByKind doesn't trip on the non-object driftCount property.
    const { driftCount: _drift, ...catOnly } = categorized
    const { links: newLinkRec, starred: newStarRec } = splitByKind(catOnly)
    // Merge fresh classifications with the entire committed cache (cached
    // items are never re-classified or dropped — only genuinely new URLs hit
    // Gemini).
    const linksRec = mergeRecords(cachedLinks, newLinkRec)
    const starredRec = mergeRecords(cachedStarred, newStarRec)
    await writeOutputs(pubDir, linksRec, starredRec)
    const totalLinks = Object.values(linksRec).reduce((n, a) => n + a.length, 0)
    const totalStars = Object.values(starredRec).reduce((n, a) => n + a.length, 0)
    console.log(
      `[categorize] wrote public/links.json (${totalLinks} items, ${Object.keys(linksRec).length} categories) and public/starred.json (${totalStars} items, ${Object.keys(starredRec).length} categories)`,
    )
  } else {
    console.log('[categorize] nothing new to classify; public/*.json unchanged')
  }
}

// Run only when invoked directly, not when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
