import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export interface Product {
  id: number
  url: string
  name: string | null
  created_at: string
}

export interface Snapshot {
  id: number
  product_id: number
  price: number | null
  currency: string | null
  in_stock: boolean | null
  confidence: number
  evidence: string | null
  model: string
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  checked_at: string
}

export interface Stats {
  products: number
  shops: number
  checks: number
  price_changes: number
  in_stock: number
  out_of_stock: number
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  last_check: string | null
}

export interface SnapshotInput {
  price: number | null
  currency: string | null
  in_stock: boolean | null
  confidence: number
  evidence: string | null
  model: string
  input_tokens: number
  output_tokens: number
  cached_tokens: number
}

interface SnapshotRow extends Omit<Snapshot, 'in_stock'> {
  in_stock: number | null
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price REAL,
    currency TEXT,
    in_stock INTEGER,
    confidence REAL NOT NULL DEFAULT 0,
    evidence TEXT,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER NOT NULL DEFAULT 0,
    checked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX IF NOT EXISTS idx_snapshots_product ON snapshots(product_id, checked_at);
`

function toSnapshot(row: SnapshotRow): Snapshot {
  return { ...row, in_stock: row.in_stock === null ? null : row.in_stock === 1 }
}

export class Store {
  private db: Database.Database

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    this.db = new Database(path)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.exec(SCHEMA)
    this.migrate()
  }

  private migrate(): void {
    const columns = (this.db.prepare('PRAGMA table_info(snapshots)').all() as Array<{ name: string }>).map((c) => c.name)
    if (!columns.includes('cached_tokens')) this.db.exec('ALTER TABLE snapshots ADD COLUMN cached_tokens INTEGER NOT NULL DEFAULT 0')
  }

  addProduct(url: string, name: string | null = null): Product {
    const existing = this.db.prepare('SELECT * FROM products WHERE url = ?').get(url) as Product | undefined
    if (existing) return existing
    const info = this.db.prepare('INSERT INTO products (url, name) VALUES (?, ?)').run(url, name)
    return this.getProduct(Number(info.lastInsertRowid))!
  }

  getProduct(id: number): Product | undefined {
    return this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined
  }

  listProducts(): Product[] {
    return this.db.prepare('SELECT * FROM products ORDER BY id').all() as Product[]
  }

  removeProduct(id: number): boolean {
    return this.db.prepare('DELETE FROM products WHERE id = ?').run(id).changes > 0
  }

  setProductName(id: number, name: string): void {
    this.db.prepare('UPDATE products SET name = ? WHERE id = ?').run(name, id)
  }

  addSnapshot(productId: number, input: SnapshotInput): Snapshot {
    const info = this.db
      .prepare(
        `INSERT INTO snapshots (product_id, price, currency, in_stock, confidence, evidence, model, input_tokens, output_tokens, cached_tokens)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        productId,
        input.price,
        input.currency,
        input.in_stock === null ? null : input.in_stock ? 1 : 0,
        input.confidence,
        input.evidence,
        input.model,
        input.input_tokens,
        input.output_tokens,
        input.cached_tokens,
      )
    const row = this.db.prepare('SELECT * FROM snapshots WHERE id = ?').get(Number(info.lastInsertRowid)) as SnapshotRow
    return toSnapshot(row)
  }

  lastSnapshot(productId: number): Snapshot | undefined {
    const row = this.db
      .prepare('SELECT * FROM snapshots WHERE product_id = ? ORDER BY checked_at DESC, id DESC LIMIT 1')
      .get(productId) as SnapshotRow | undefined
    return row ? toSnapshot(row) : undefined
  }

  history(productId: number, limit = 100): Snapshot[] {
    const rows = this.db
      .prepare('SELECT * FROM snapshots WHERE product_id = ? ORDER BY checked_at DESC, id DESC LIMIT ?')
      .all(productId, limit) as SnapshotRow[]
    return rows.map(toSnapshot).reverse()
  }

  stats(): Stats {
    const base = this.db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM products) AS products,
                (SELECT COUNT(DISTINCT substr(url, instr(url, '//') + 2, instr(substr(url, instr(url, '//') + 2), '/') - 1)) FROM products) AS shops,
                COUNT(*) AS checks,
                COALESCE(SUM(input_tokens), 0) AS input_tokens,
                COALESCE(SUM(output_tokens), 0) AS output_tokens,
                COALESCE(SUM(cached_tokens), 0) AS cached_tokens,
                MAX(checked_at) AS last_check
         FROM snapshots`,
      )
      .get() as Omit<Stats, 'price_changes' | 'in_stock' | 'out_of_stock'>
    const changes = this.db
      .prepare(
        `SELECT COUNT(*) AS n FROM (
           SELECT price, LAG(price) OVER (PARTITION BY product_id ORDER BY checked_at, id) AS prev FROM snapshots
         ) WHERE prev IS NOT NULL AND price IS NOT NULL AND price != prev`,
      )
      .get() as { n: number }
    const stock = this.db
      .prepare(
        `SELECT COALESCE(SUM(in_stock = 1), 0) AS in_stock, COALESCE(SUM(in_stock = 0), 0) AS out_of_stock FROM (
           SELECT in_stock, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY checked_at DESC, id DESC) AS rn FROM snapshots
         ) WHERE rn = 1`,
      )
      .get() as { in_stock: number; out_of_stock: number }
    return { ...base, price_changes: changes.n, in_stock: stock.in_stock, out_of_stock: stock.out_of_stock }
  }

  close(): void {
    this.db.close()
  }
}
