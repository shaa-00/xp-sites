import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createDatabaseClient, ensureDatabase, insertItem, closeDatabase } from './db.mjs'

function loadEnvLocal() {
    const path = resolve('.env.local')
    return readFile(path, 'utf8').then((text) => {
        for (const line of text.split(/\r?\n/)) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#')) continue
            const index = trimmed.indexOf('=')
            if (index > 0) {
                const key = trimmed.slice(0, index)
                if (!(key in process.env)) process.env[key] = trimmed.slice(index + 1)
            }
        }
    })
}

async function readJson(path, fallback) {
    try {
        return JSON.parse(await readFile(path, 'utf8'))
    } catch {
        return fallback
    }
}

async function main() {
    await loadEnvLocal()
    const client = createDatabaseClient()
    try {
        await ensureDatabase(client)
        const links = await readJson('public/links.json', {})
        const starred = await readJson('public/starred.json', {})
        let imported = 0

        for (const [category, records] of Object.entries(links)) {
            for (const record of records) {
                await insertItem(client, {
                    ...record,
                    category,
                    source: 'bookmark',
                }, { overwrite: true })
                imported++
            }
        }

        for (const [category, records] of Object.entries(starred)) {
            for (const record of records) {
                await insertItem(client, {
                    title: record.name,
                    url: record.url,
                    description: record.description,
                    stars: record.stars,
                    language: record.language,
                    topics: record.topics,
                    category,
                    source: 'github',
                })
                imported++
            }
        }

        console.log(`[import] processed ${imported} records; bookmark URLs take precedence`)
    } finally {
        closeDatabase(client)
    }
}

main().catch((error) => {
    console.error(`[import] failed: ${error.message}`)
    process.exitCode = 1
})