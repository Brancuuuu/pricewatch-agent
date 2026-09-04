export const CURRENCY_PATTERN = /(\d[\d\s.,]*\d|\d)\s*(zł|zl|PLN|€|EUR|\$|USD|£|GBP|CZK|Kč|CHF)|(€|\$|£|PLN|EUR|USD|GBP)\s*(\d[\d\s.,]*\d|\d)/i

export function collapseWhitespace(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function clip(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '\n[...]'
}

export function priceCandidates(text: string, limit = 40): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.length === 0 || line.length > 160) continue
    if (!CURRENCY_PATTERN.test(line)) continue
    if (seen.has(line)) continue
    seen.add(line)
    out.push(line)
    if (out.length >= limit) break
  }
  return out
}

export interface PageHints {
  jsonLd: unknown[]
  meta: Record<string, string>
}

const OFFER_TYPES = new Set(['Product', 'Offer', 'AggregateOffer', 'ProductGroup'])

function walk(node: unknown, found: unknown[], depth = 0): void {
  if (depth > 6 || node === null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walk(item, found, depth + 1)
    return
  }
  const obj = node as Record<string, unknown>
  const type = obj['@type']
  const types = Array.isArray(type) ? type : [type]
  if (types.some((t) => typeof t === 'string' && OFFER_TYPES.has(t))) {
    found.push(obj)
    return
  }
  for (const value of Object.values(obj)) walk(value, found, depth + 1)
}

export function productHints(hints: PageHints): string {
  const nodes: unknown[] = []
  walk(hints.jsonLd, nodes)
  const trimmed = nodes.slice(0, 3).map((node) => {
    const obj = node as Record<string, unknown>
    const keep: Record<string, unknown> = {}
    for (const key of ['@type', 'name', 'sku', 'brand', 'offers', 'price', 'priceCurrency', 'availability', 'lowPrice', 'highPrice']) {
      if (key in obj) keep[key] = obj[key]
    }
    return keep
  })
  const meta = Object.entries(hints.meta).filter(([key]) => /price|availability|currency|og:title|product/i.test(key))
  const parts: string[] = []
  if (trimmed.length) parts.push('JSON-LD:\n' + clip(JSON.stringify(trimmed), 3000))
  if (meta.length) parts.push('META:\n' + meta.map(([k, v]) => `${k} = ${v}`).join('\n'))
  return parts.join('\n\n')
}

export function buildModelInput(page: { url: string; title: string; text: string; hints: PageHints }, maxChars: number): string {
  const body = collapseWhitespace(page.text)
  const sections = [
    `URL: ${page.url}`,
    `TITLE: ${page.title}`,
  ]
  const hints = productHints(page.hints)
  if (hints) sections.push(`STRUCTURED HINTS:\n${hints}`)
  const candidates = priceCandidates(body)
  if (candidates.length) sections.push(`LINES WITH PRICES:\n${candidates.join('\n')}`)
  sections.push(`PAGE TEXT:\n${clip(body, maxChars)}`)
  return sections.join('\n\n')
}
