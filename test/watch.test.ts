import { describe, expect, it } from 'vitest'
import { Store } from '../src/db.js'
import { hasChanged } from '../src/watch.js'
import { describeChange, formatPrice } from '../src/notify.js'

const snapshot = (price: number | null, in_stock: boolean | null = true) => ({
  price,
  currency: 'PLN',
  in_stock,
  confidence: 0.9,
  evidence: null,
  model: 'test',
  input_tokens: 10,
  output_tokens: 5,
})

describe('Store', () => {
  it('stores products and keeps history in order', () => {
    const store = new Store(':memory:')
    const product = store.addProduct('https://shop.test/p/1')
    expect(store.addProduct('https://shop.test/p/1').id).toBe(product.id)
    store.addSnapshot(product.id, snapshot(100))
    store.addSnapshot(product.id, snapshot(90, false))
    const history = store.history(product.id)
    expect(history.map((s) => s.price)).toEqual([100, 90])
    expect(store.lastSnapshot(product.id)?.in_stock).toBe(false)
    expect(store.totals()).toMatchObject({ products: 1, snapshots: 2, input_tokens: 20 })
    expect(store.removeProduct(product.id)).toBe(true)
    expect(store.listProducts()).toHaveLength(0)
    store.close()
  })
})

describe('hasChanged', () => {
  const store = new Store(':memory:')
  const product = store.addProduct('https://shop.test/p/2')
  it('reports price and stock changes, ignores the first check', () => {
    const first = store.addSnapshot(product.id, snapshot(100))
    expect(hasChanged(undefined, first)).toBe(false)
    const same = store.addSnapshot(product.id, snapshot(100))
    expect(hasChanged(first, same)).toBe(false)
    const cheaper = store.addSnapshot(product.id, snapshot(80))
    expect(hasChanged(same, cheaper)).toBe(true)
    const soldOut = store.addSnapshot(product.id, snapshot(80, false))
    expect(hasChanged(cheaper, soldOut)).toBe(true)
  })
  it('does not alert when the price could not be read this time', () => {
    const known = store.addSnapshot(product.id, snapshot(80))
    const unknown = store.addSnapshot(product.id, snapshot(null, null))
    expect(hasChanged(known, unknown)).toBe(false)
  })
})

describe('formatting', () => {
  it('formats money the Polish way', () => {
    expect(formatPrice(4299, 'PLN')).toBe('4299,00 PLN')
    expect(formatPrice(null, 'PLN')).toBe('no price')
  })
  it('describes a change in one line', () => {
    const store = new Store(':memory:')
    const product = store.addProduct('https://shop.test/p/3', 'Laptop')
    const previous = store.addSnapshot(product.id, snapshot(100))
    const current = store.addSnapshot(product.id, snapshot(90, false))
    expect(describeChange({ product, previous, current })).toBe('Laptop: 100,00 PLN -> 90,00 PLN, stock: in stock -> out of stock')
  })
})
