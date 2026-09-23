import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CATEGORIES,
  parseFirefoxBookmarks,
  filterNoise,
  mapStarredRepos,
  assignCategories,
  normalizeCategory,
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

test('the fixed category list has no implicit fallback category', () => {
  assert.equal(CATEGORIES.length, 18)
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

test('normalizeCategory rejects unknown/drifting categories', () => {
  assert.throws(() => normalizeCategory('Some New Thing'), /Invalid category/)
  assert.throws(() => normalizeCategory(''), /Invalid category/)
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

test('assignCategories rejects model drift instead of using a fallback', async () => {
  const links = [
    { title: 'Real', url: 'https://real.com' },
    { title: 'Drifty', url: 'https://drift.com' },
  ]
  await assert.rejects(
    assignCategories(links, [], {
      batchSize: 10,
      callGemini: async () => ['AI Tools & Agents', 'Brand New Category 999'],
    }),
    /Invalid category/,
  )
})

test('assignCategories accepts valid categories without fallback metadata', async () => {
  const links = [{ title: 'x', url: 'https://example.com/x' }]
  const out = await assignCategories(links, [], {
    batchSize: 10,
    callGemini: async () => ['Developer Tools & Productivity'],
  })
  assert.deepEqual(out['Developer Tools & Productivity'], links.map((item) => ({ kind: 'link', ...item })))
})


test('assignCategories rejects a category outside the fixed list', async () => {
  const links = [{ title: 'x', url: 'https://example.com/x' }]
  // Malicious/model-drift categorizer returning an invented name.
  await assert.rejects(
    assignCategories(links, [], {
      batchSize: 10,
      callGemini: async () => ['Brand New Category 999'],
    }),
    /Invalid category/,
  )
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

