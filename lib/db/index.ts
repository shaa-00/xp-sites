import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const client = createClient({
  url: requiredEnv('TURSO_DATABASE_URL'),
  authToken: requiredEnv('TURSO_AUTH_TOKEN'),
})

export const db = drizzle(client, { schema })