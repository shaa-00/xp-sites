import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  order: integer('sort_order').notNull(),
})

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  url: text('url').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  source: text('source', { enum: ['bookmark', 'github'] }).notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  stars: integer('stars'),
  language: text('language'),
  topics: text('topics', { mode: 'json' }).$type<string[]>().notNull(),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
})

export type Category = typeof categories.$inferSelect
export type Item = typeof items.$inferSelect