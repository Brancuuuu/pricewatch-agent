import { setTimeout as sleep } from 'node:timers/promises'
import { config } from './config.js'
import type { Product, Snapshot, Store } from './db.js'
import { capturePage, closeBrowser } from './fetch.js'
import { extractProduct } from './extract.js'
import { notifyDiscord, describeChange, type PriceChange } from './notify.js'

export interface CheckResult {
  product: Product
  current: Snapshot
  previous: Snapshot | undefined
  changed: boolean
  notified: boolean
}

export function hasChanged(previous: Snapshot | undefined, current: Snapshot): boolean {
  if (!previous) return false
  if (current.price === null && previous.price !== null) return false
  return previous.price !== current.price || previous.in_stock !== current.in_stock
}

export async function checkProduct(store: Store, product: Product): Promise<CheckResult> {
  const page = await capturePage(product.url)
  const extraction = await extractProduct(page)
  const previous = store.lastSnapshot(product.id)
  const current = store.addSnapshot(product.id, {
    price: extraction.info.price,
    currency: extraction.info.currency,
    in_stock: extraction.info.in_stock,
    confidence: extraction.info.confidence,
    evidence: extraction.info.evidence,
    model: extraction.model,
    input_tokens: extraction.inputTokens,
    output_tokens: extraction.outputTokens,
    cached_tokens: extraction.cachedTokens,
  })
  if (!product.name && extraction.info.name) {
    store.setProductName(product.id, extraction.info.name)
    product = { ...product, name: extraction.info.name }
  }
  const changed = hasChanged(previous, current)
  let notified = false
  if (changed && previous) {
    const change: PriceChange = { product, previous, current }
    console.log('CHANGE ' + describeChange(change))
    notified = await notifyDiscord(change).catch((error: Error) => {
      console.error('notification failed: ' + error.message)
      return false
    })
  }
  return { product, current, previous, changed, notified }
}

export async function checkAll(store: Store, delayMs = 1500): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  const products = store.listProducts()
  for (const [index, product] of products.entries()) {
    try {
      results.push(await checkProduct(store, product))
    } catch (error) {
      console.error(`#${product.id} ${product.url}: ${(error as Error).message}`)
    }
    if (index < products.length - 1) await sleep(delayMs)
  }
  return results
}

export async function watchLoop(store: Store, intervalMinutes = config.watchIntervalMinutes): Promise<never> {
  for (;;) {
    const started = Date.now()
    console.log(`[${new Date().toISOString()}] checking ${store.listProducts().length} products`)
    const results = await checkAll(store)
    const changes = results.filter((r) => r.changed).length
    console.log(`done in ${Math.round((Date.now() - started) / 1000)} s, ${changes} change(s)`)
    await closeBrowser()
    await sleep(intervalMinutes * 60_000)
  }
}
