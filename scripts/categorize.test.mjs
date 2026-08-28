import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CATEGORIES,
  FALLBACK_CATEGORY,
  parseFirefoxBookmarks,
  filterNoise,
  mapStarredRepos,
  assignCategories,
  normalizeCategory,
  mergeRecords,
  writeOutputs,
  flattenRecord,
  knownByCategory,
  splitByKind,
} from './categorize.mjs'

const FIXTURE = {
  type: 'text/x-moz-place-container',
  children: [
    {
      type: 'text/x-moz-place-container',
      title: 'Dev',
      children: [
        {
          type: 'text/x-moz-place',
          title: 'React Docs',
          uri: 'https://react.dev/',
        },
        {
          type: 'text/x-moz-place',
          title: 'Console',
          uri: 'https://console.cloud.google.com/auth/clients',
        },
      ],
    },
    {
      type: 'text/x-moz-place',
      title: 'Pixiv Art',
      uri: 'https://www.pixiv.net/en/artworks/133352325',
    },
  ],
}

test('CATEGORIES is the fixed 18-item closed list including new categories', () => {
  assert.equal(CATEGORIES.length, 18)
  assert.ok(CATEGORIES.includes('Free Resources & Open Source Lists'))
  assert.ok(CATEGORIES.includes('AI Tools & Agents'))
  assert.ok(CATEGORIES.includes('AI Skills & Context'))
  assert.ok(CATEGORIES.includes('Utilities & Scripts'))
  assert.ok(CATEGORIES.includes('Self-Hosted & Architecture'))
})

test('FALLBACK_CATEGORY is a real category in the fixed list', () => {
  assert.ok(CATEGORIES.includes(FALLBACK_CATEGORY))
})

test('parseFirefoxBookmarks extracts every place, recursing folders', () => {
  const out = parseFirefoxBookmarks(FIXTURE)
  assert.deepEqual(out, [
    { title: 'React Docs', url: 'https://react.dev/' },
    { title: 'Console', url: 'https://console.cloud.google.com/auth/clients' },
    { title: 'Pixiv Art', url: 'https://www.pixiv.net/en/artworks/133352325' },
  ])
})

test('parseFirefoxBookmarks ignores non-place nodes', () => {
  const out = parseFirefoxBookmarks({
    type: 'text/x-moz-place-container',
    children: [{ type: 'separator' }, { type: 'text/x-moz-place-container' }],
  })
  assert.deepEqual(out, [])
})

test('filterNoise drops URLs matching the denylist', () => {
  const input = [
    { title: 'Console', url: 'https://console.cloud.google.com/auth/clients' },
    { title: 'Drive PDF', url: 'https://drive.google.com/file/d/abc/view' },
    { title: 'Friend', url: 'https://github.com/some-friend' },
    { title: 'Real', url: 'https://react.dev/' },
  ]
  const out = filterNoise(input)
  assert.deepEqual(out, [{ title: 'Real', url: 'https://react.dev/' }])
})

test('mapStarredRepos maps GitHub API repos to the fixed shape', () => {
  const api = [
    {
      name: 'owner/repo',
      html_url: 'https://github.com/owner/repo',
      description: 'A cool tool',
      stargazers_count: 123,
      language: 'TypeScript',
      topics: ['cli', 'tool'],
    },
  ]
  assert.deepEqual(mapStarredRepos(api), [
    {
      name: 'owner/repo',
      url: 'https://github.com/owner/repo',
      description: 'A cool tool',
      stars: 123,
      language: 'TypeScript',
      topics: ['cli', 'tool'],
    },
  ])
})

test('normalizeCategory passes through a known category verbatim', () => {
  assert.equal(normalizeCategory('AI Tools & Agents'), 'AI Tools & Agents')
})

test('normalizeCategory reroutes unknown/drifting category to fallback', () => {
  assert.equal(normalizeCategory('Some New Thing'), FALLBACK_CATEGORY)
  assert.equal(normalizeCategory(''), FALLBACK_CATEGORY)
})

test('assignCategories offline assigns one real category to each item, batch size respected', async () => {
  const links = [
    { title: 'React docs', url: 'https://react.dev' },
    { title: 'Pixiv art', url: 'https://www.pixiv.net/x' },
  ]
  const starred = [
    { name: 'o/r', url: 'https://github.com/o/r', description: 'a tool', stars: 1, language: 'Go', topics: [] },
  ]
  let batches = 0
  const out = await assignCategories(links, starred, {
    batchSize: 1,
    callGemini: async (items) => {
      batches += 1
      // Echo a deterministic assignment for the test (not real AI).
      return items.map((it) => 'AI Tools & Agents')
    },
  })
  assert.equal(batches, 3)
  assert.equal(out['AI Tools & Agents'].length, 3)
  for (const cat of Object.keys(out)) {
    if (cat === 'driftCount') continue
    assert.ok(CATEGORIES.includes(cat))
  }
})

test('assignCategories returns a driftCount and warns when Gemini drifts', async () => {
  const links = [
    { title: 'Real', url: 'https://real.com' },
    { title: 'Drifty', url: 'https://drift.com' },
  ]
  let warned = ''
  const origWarn = console.warn
  console.warn = (m) => { warned += m }
  try {
    // One valid category, one invented (drifting) category.
    const out = await assignCategories(links, [], {
      batchSize: 10,
      callGemini: async () => ['AI Tools & Agents', 'Brand New Category 999'],
    })
    assert.ok(CATEGORIES.includes('AI Tools & Agents'))
    assert.equal(out['AI Tools & Agents'].length, 1)
    assert.equal(out[FALLBACK_CATEGORY].length, 1)
    assert.equal(out.driftCount, 1)
    assert.match(warned, /rerouted.*fallback.*drift/i)
  } finally {
    console.warn = origWarn
  }
})

test('assignCategories driftCount is 0 and warns nothing when all categories are valid', async () => {
  const links = [{ title: 'x', url: 'https://example.com/x' }]
  let warned = ''
  const origWarn = console.warn
  console.warn = (m) => { warned += m }
  try {
    const out = await assignCategories(links, [], {
      batchSize: 10,
      callGemini: async () => ['Developer Tools & Productivity'],
    })
    assert.equal(out.driftCount, 0)
    assert.equal(warned, '')
  } finally {
    console.warn = origWarn
  }
})


test('assignCategories never produces a category outside the fixed list', async () => {
  const links = [{ title: 'x', url: 'https://example.com/x' }]
  // Malicious/model-drift categorizer returning an invented name.
  const out = await assignCategories(links, [], {
    batchSize: 10,
    callGemini: async () => ['Brand New Category 999'],
  })
  assert.ok(Object.keys(out).filter(k => k !== 'driftCount').every(k => CATEGORIES.includes(k)))
})

test('assignCategories batches large inputs by 40', async () => {
  const links = Array.from({ length: 85 }, (_, i) => ({ title: `t${i}`, url: `https://e.com/${i}` }))
  let calls = 0
  await assignCategories(links, [], {
    batchSize: 40,
    callGemini: async (items) => {
      calls += 1
      assert.ok(items.length <= 40)
      return items.map(() => 'Developer Tools & Productivity')
    },
  })
  assert.equal(calls, 3) // 40 + 40 + 5
})

test('mergeRecords drops empty categories, keeps non-empty ones', () => {
  const merged = mergeRecords(
    { A: [{ title: 'a', url: 'u' }] },
    { B: [] },
    { 'Free Resources & Open Source Lists': [{ title: 'c', url: 'v' }] },
  )
  assert.ok('A' in merged)
  assert.ok(!('B' in merged))
  assert.equal(merged['Free Resources & Open Source Lists'][0].url, 'v')
})

test('writeOutputs writes two JSON files shaped as Record<string, Item[]>', async () => {
  const fs = await import('node:fs/promises')
  const os = await import('node:os')
  const path = await import('node:path')
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cat-test-'))
  const data = { 'AI Tools & Agents': [{ title: 'x', url: 'https://x.com' }] }
  await writeOutputs(dir, data, data)
  const links = JSON.parse(await fs.readFile(path.join(dir, 'links.json'), 'utf8'))
  const starred = JSON.parse(await fs.readFile(path.join(dir, 'starred.json'), 'utf8'))
  assert.deepEqual(links, data)
  assert.deepEqual(starred, data)
  await fs.rm(dir, { recursive: true, force: true })
})

// --- caching: never re-categorize a URL we already classified ---

test('flattenRecord maps every url to its item', () => {
  const rec = {
    'AI Tools & Agents': [{ title: 'x', url: 'https://x.com' }],
    'Anime & Art': [{ title: 'y', url: 'https://y.com' }],
  }
  const flat = flattenRecord(rec)
  assert.equal(flat.get('https://x.com').title, 'x')
  assert.equal(flat.get('https://y.com').title, 'y')
  assert.equal(flat.size, 2)
})

test('knownByCategory keeps only present urls, drops removed ones', () => {
  const cached = { 'AI Tools & Agents': [{ title: 'Old', url: 'https://old.com' }] }
  // old.com is gone from the new bookmarks; nothing present -> empty record.
  assert.deepEqual(knownByCategory(cached, new Set(['https://react.dev'])), {})
  // If it were present, it survives under its original category.
  assert.deepEqual(knownByCategory(cached, new Set(['https://old.com'])), cached)
})

test('only new URLs are sent to Gemini; cached URLs keep their category', async () => {
  const cached = { 'Developer Tools & Productivity': [{ title: 'React', url: 'https://react.dev' }] }
  const links = [
    { title: 'React', url: 'https://react.dev' }, // cached -> NOT resent
    { title: 'Next', url: 'https://nextjs.org' }, // new -> sent
  ]
  const flat = flattenRecord(cached)
  const unknown = links.filter((l) => !flat.has(l.url))
  assert.deepEqual(unknown, [{ title: 'Next', url: 'https://nextjs.org' }])

  let batches = 0
  const newCat = await assignCategories(unknown, [], {
    batchSize: 40,
    callGemini: async (items) => {
      batches += 1
      return items.map(() => 'AI Tools & Agents')
    },
  })
  assert.equal(batches, 1) // only the new URL, not the cached one

  const { driftCount: _ignore, ...catOnly } = newCat
  assert.equal(_ignore, 0)
  const known = knownByCategory(cached, new Set(links.map((l) => l.url)))
  const finalLinks = mergeRecords(known, splitByKind(catOnly).links)
  assert.equal(finalLinks['Developer Tools & Productivity'][0].url, 'https://react.dev')
  assert.equal(finalLinks['AI Tools & Agents'][0].url, 'https://nextjs.org')
})
