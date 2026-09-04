import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import type { Store } from './db.js'
import { checkProduct } from './watch.js'
import { DASHBOARD_HTML } from './dashboard.js'

export function createApp(store: Store): Hono {
  const app = new Hono()

  app.get('/', (c) => c.html(DASHBOARD_HTML))

  app.get('/api/products', (c) => {
    const products = store.listProducts().map((product) => ({ ...product, last: store.lastSnapshot(product.id) ?? null }))
    return c.json({ products, totals: store.totals() })
  })

  app.post('/api/products', async (c) => {
    const body = await c.req.json<{ url?: string; name?: string }>().catch(() => ({}) as { url?: string; name?: string })
    if (!body.url || !/^https?:\/\//.test(body.url)) return c.json({ error: 'url must start with http(s)://' }, 400)
    const product = store.addProduct(body.url, body.name ?? null)
    return c.json({ product }, 201)
  })

  app.get('/api/products/:id', (c) => {
    const product = store.getProduct(Number(c.req.param('id')))
    if (!product) return c.json({ error: 'not found' }, 404)
    return c.json({ product, history: store.history(product.id) })
  })

  app.delete('/api/products/:id', (c) => {
    return store.removeProduct(Number(c.req.param('id'))) ? c.body(null, 204) : c.json({ error: 'not found' }, 404)
  })

  app.post('/api/products/:id/check', async (c) => {
    const product = store.getProduct(Number(c.req.param('id')))
    if (!product) return c.json({ error: 'not found' }, 404)
    try {
      const result = await checkProduct(store, product)
      return c.json(result)
    } catch (error) {
      return c.json({ error: (error as Error).message }, 502)
    }
  })

  return app
}

export function startServer(store: Store, port: number): void {
  const app = createApp(store)
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`dashboard: http://localhost:${info.port}/`)
  })
}
