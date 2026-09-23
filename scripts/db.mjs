import { createClient } from '@libsql/client'
import { randomUUID } from 'node:crypto'

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

export function slugify(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function isSafeHttpUrl(value) {
    try {
        const url = new URL(value)
        return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname)
    } catch {
        return false
    }
}

function requiredEnv(name) {
    const value = process.env[name]
    if (!value) throw new Error(`Missing required environment variable: ${name}`)
    return value
}

export function createDatabaseClient() {
    return createClient({
        url: requiredEnv('TURSO_DATABASE_URL'),
        authToken: requiredEnv('TURSO_AUTH_TOKEN'),
    })
}

export async function ensureDatabase(client) {
    await client.batch([
        `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL
    )`,
        `CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      source TEXT NOT NULL CHECK (source IN ('bookmark', 'github')),
      category_id TEXT NOT NULL REFERENCES categories(id),
      stars INTEGER,
      language TEXT,
      topics TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    ], 'write')

    for (const [order, name] of CATEGORIES.entries()) {
        await client.execute({
            sql: 'INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING',
            args: [slugify(name), name, order],
        })
    }
}

export async function getItems(client) {
    const result = await client.execute('SELECT * FROM items ORDER BY rowid')
    return result.rows.map((row) => ({
        ...row,
        topics: JSON.parse(String(row.topics || '[]')),
    }))
}

export async function insertItem(client, item, { overwrite = false } = {}) {
    if (!isSafeHttpUrl(item.url)) throw new Error(`Unsupported item URL: ${item.url}`)
    const sql = overwrite
        ? `INSERT INTO items
        (id, url, title, description, source, category_id, stars, language, topics)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (url) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        source = excluded.source,
        category_id = excluded.category_id,
        stars = excluded.stars,
        language = excluded.language,
        topics = excluded.topics,
        updated_at = CURRENT_TIMESTAMP`
        : `INSERT INTO items
        (id, url, title, description, source, category_id, stars, language, topics)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (url) DO NOTHING`

    await client.execute({
        sql,
        args: [
            randomUUID(),
            item.url,
            item.title,
            item.description || null,
            item.source,
            slugify(item.category),
            item.stars ?? null,
            item.language ?? null,
            JSON.stringify(item.topics || []),
        ],
    })
}

export async function updateItemCategory(client, url, category) {
    await client.execute({
        sql: 'UPDATE items SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE url = ?',
        args: [slugify(category), url],
    })
}

export async function closeDatabase(client) {
    client.close()
}