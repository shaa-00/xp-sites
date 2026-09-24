import { test } from 'node:test'
import assert from 'node:assert/strict'

// Test 1: Defensive Lookup Guard for LinkExplorer categorization
function getDisplayedItems(categorized, filteredCategory, filteredLink) {
  if (!categorized || typeof categorized !== 'object') {
    return {}
  }
  if (filteredCategory) {
    return { [filteredCategory]: categorized[filteredCategory] || [] }
  }
  if (filteredLink) {
    return Object.entries(categorized).reduce((acc, [cat, items]) => {
      const matches = (items || []).filter((l) => l.url === filteredLink)
      if (matches.length) acc[cat] = matches
      return acc
    }, {})
  }
  return categorized
}

test('getDisplayedItems returns empty array for missing filteredCategory when categorized is empty or missing key', () => {
  assert.deepEqual(getDisplayedItems({}, 'NonExistent', null), { NonExistent: [] })
  assert.deepEqual(getDisplayedItems(null, 'NonExistent', null), {})
})

test('getDisplayedItems handles valid category filter correctly', () => {
  const catData = { Tools: [{ title: 'Tool 1', url: 'https://tool1.com' }] }
  assert.deepEqual(getDisplayedItems(catData, 'Tools', null), catData)
})
