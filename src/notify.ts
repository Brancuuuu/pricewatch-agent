import { config } from './config.js'
import type { Product, Snapshot } from './db.js'

export interface PriceChange {
  product: Product
  previous: Snapshot
  current: Snapshot
}

export function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return 'no price'
  const formatted = price.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency ? `${formatted} ${currency}` : formatted
}

export function describeChange(change: PriceChange): string {
  const name = change.product.name || change.product.url
  const before = formatPrice(change.previous.price, change.previous.currency)
  const after = formatPrice(change.current.price, change.current.currency)
  const parts: string[] = []
  if (change.previous.price !== change.current.price) parts.push(`${before} -> ${after}`)
  if (change.previous.in_stock !== change.current.in_stock) {
    parts.push(`stock: ${stockLabel(change.previous.in_stock)} -> ${stockLabel(change.current.in_stock)}`)
  }
  return `${name}: ${parts.join(', ')}`
}

export function stockLabel(inStock: boolean | null): string {
  if (inStock === null) return 'unknown'
  return inStock ? 'in stock' : 'out of stock'
}

export async function notifyDiscord(change: PriceChange, webhookUrl = config.discordWebhookUrl): Promise<boolean> {
  if (!webhookUrl) return false
  const dropped =
    change.previous.price !== null && change.current.price !== null && change.current.price < change.previous.price
  const body = {
    username: 'pricewatch',
    embeds: [
      {
        title: change.product.name || 'Product',
        url: change.product.url,
        description: describeChange(change),
        color: dropped ? 0x1a7f4b : 0xb42318,
        fields: [
          { name: 'Before', value: formatPrice(change.previous.price, change.previous.currency), inline: true },
          { name: 'Now', value: formatPrice(change.current.price, change.current.currency), inline: true },
          { name: 'Stock', value: stockLabel(change.current.in_stock), inline: true },
        ],
        footer: { text: `confidence ${Math.round(change.current.confidence * 100)}%` },
        timestamp: change.current.checked_at,
      },
    ],
  }
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Discord webhook failed: ${response.status} ${await response.text()}`)
  return true
}
