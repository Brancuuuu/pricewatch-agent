import { describe, expect, it } from 'vitest'
import { buildModelInput, clip, collapseWhitespace, priceCandidates, productHints } from '../src/text.js'

describe('collapseWhitespace', () => {
  it('squeezes spaces and blank lines', () => {
    expect(collapseWhitespace('  a \t b\n\n\n\n c  \n')).toBe('a b\n\nc')
  })
})

describe('clip', () => {
  it('marks the cut', () => {
    expect(clip('abcdef', 3)).toBe('abc\n[...]')
    expect(clip('abc', 3)).toBe('abc')
  })
})

describe('priceCandidates', () => {
  it('keeps only lines that look like prices, without duplicates', () => {
    const text = ['Laptop XYZ', 'Cena: 4 299,00 zł', 'Cena: 4 299,00 zł', '€ 999', 'Dostawa gratis', '1234'].join('\n')
    expect(priceCandidates(text)).toEqual(['Cena: 4 299,00 zł', '€ 999'])
  })
  it('respects the limit', () => {
    const text = Array.from({ length: 50 }, (_, i) => `${i} zł`).join('\n')
    expect(priceCandidates(text, 5)).toHaveLength(5)
  })
})

describe('productHints', () => {
  it('finds Product nodes nested in a graph and keeps only offer fields', () => {
    const jsonLd = [
      { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebSite', name: 'Shop' }, { '@type': 'Product', name: 'Laptop', description: 'long text', offers: { '@type': 'Offer', price: '4299.00', priceCurrency: 'PLN' } }] },
    ]
    const hints = productHints({ jsonLd, meta: { 'product:price:amount': '4299.00', 'og:image': 'x.jpg' } })
    expect(hints).toContain('"name":"Laptop"')
    expect(hints).not.toContain('long text')
    expect(hints).toContain('product:price:amount = 4299.00')
    expect(hints).not.toContain('og:image')
  })
  it('returns an empty string without hints', () => {
    expect(productHints({ jsonLd: [], meta: {} })).toBe('')
  })
})

describe('buildModelInput', () => {
  it('puts price lines before the clipped body', () => {
    const input = buildModelInput(
      { url: 'https://x', title: 'T', text: 'intro\n'.repeat(50) + 'Cena 99 zł', hints: { jsonLd: [], meta: {} } },
      40,
    )
    expect(input.indexOf('LINES WITH PRICES:\nCena 99 zł')).toBeGreaterThan(-1)
    expect(input.indexOf('LINES WITH PRICES')).toBeLessThan(input.indexOf('PAGE TEXT'))
    expect(input).toContain('[...]')
  })
})
