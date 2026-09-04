import { page } from './ui.js'

const BODY = `
<style>
  form.add { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
  form.add input { flex: 1; min-width: 260px; background: var(--surface); border: 1px solid var(--line); color: var(--ink); padding: 11px 14px; border-radius: 999px; font: inherit; }
  form.add input:focus { outline: 2px solid var(--accent); outline-offset: 1px; border-color: transparent; }
  .item { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 16px 20px; margin-bottom: 10px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 24px; align-items: center; }
  .item h2 { margin: 0; font-size: 16px; font-weight: 700; }
  .item h2 a { text-decoration: none; }
  .item h2 a:hover { color: var(--accent-dark); }
  .item .host { color: var(--muted); font-size: 12px; text-decoration: none; }
  .item .host:hover { color: var(--accent-dark); }
  .item .price { font-size: 24px; text-align: right; }
  .item .meta { color: var(--muted); font-size: 12px; text-align: right; }
  .item .foot { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding-top: 8px; border-top: 1px dashed var(--line); }
  .item .foot svg { display: block; }
  @media (max-width: 640px) { .item { grid-template-columns: 1fr; } .item .price, .item .meta { text-align: left; } }
</style>
<div class="stats" id="stats"></div>
<form class="add" id="add">
  <input name="url" type="url" placeholder="Paste a product page URL from any shop" required>
  <button class="btn" type="submit">Watch it</button>
</form>
<div class="status" id="status"></div>
<div id="list"><div class="empty">Loading</div></div>
`

const SCRIPT = `
  const list = document.getElementById('list')
  const status = document.getElementById('status')
  const stats = document.getElementById('stats')
  const money = (p, c) => p === null || p === undefined ? 'no price' : p.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (c ? ' ' + c : '')
  const badge = (s) => s === null || s === undefined ? '<span class="badge na">stock unknown</span>' : (s ? '<span class="badge in">in stock</span>' : '<span class="badge out">out of stock</span>')
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
  const host = (url) => { try { return new URL(url).hostname.replace(/^www\\./, '') } catch { return url } }

  function sparkline(points) {
    const prices = points.map((p) => p.price).filter((p) => p !== null)
    if (prices.length < 2) return '<span class="muted" style="font-size:12px">chart after the second check</span>'
    const w = 200, h = 36, min = Math.min(...prices), max = Math.max(...prices)
    const x = (i) => (i / (prices.length - 1)) * (w - 4) + 2
    const y = (p) => max === min ? h / 2 : h - 3 - ((p - min) / (max - min)) * (h - 6)
    const d = prices.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p).toFixed(1)).join(' ')
    const last = prices[prices.length - 1], first = prices[0]
    const color = last < first ? '#1a7f4b' : last > first ? '#b42318' : '#152238'
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/></svg>'
  }

  async function load() {
    const data = await (await fetch('/api/products')).json()
    const s = data.stats
    const tokens = s.input_tokens + s.output_tokens
    const cached = tokens ? Math.round((s.cached_tokens / tokens) * 100) : 0
    stats.innerHTML = [
      [s.products, 'products'],
      [s.shops, 'shops'],
      [s.checks, 'checks'],
      [s.price_changes, 'price changes'],
      [s.in_stock, 'in stock, ' + s.out_of_stock + ' out'],
      [tokens.toLocaleString('en'), 'tokens, ' + cached + '% cached'],
      [s.last_check ? s.last_check.slice(11, 16) : '-', 'last check' + (s.last_check ? ' ' + s.last_check.slice(0, 10) : '')],
    ].map(([v, l]) => '<div class="stat"><b>' + v + '</b><span>' + l + '</span></div>').join('')
    if (!data.products.length) { list.innerHTML = '<div class="empty">Nothing watched yet. Paste a product URL above.</div>'; return }
    const items = await Promise.all(data.products.map(async (p) => {
      const hist = (await (await fetch('/api/products/' + p.id)).json()).history
      const prev = hist.length > 1 ? hist[hist.length - 2] : null
      const last = p.last
      let delta = ''
      if (prev && last && prev.price !== null && last.price !== null && prev.price !== last.price) {
        const diff = last.price - prev.price
        delta = '<br><span class="' + (diff > 0 ? 'up' : 'down') + '">' + (diff > 0 ? '+' : '') + money(diff, last.currency) + '</span> since previous check'
      }
      return '<div class="item">'
        + '<div><h2><a href="/product/' + p.id + '">' + esc(p.name || 'Unnamed product') + '</a></h2><a class="host" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(host(p.url)) + '</a></div>'
        + '<div><div class="price">' + (last ? money(last.price, last.currency) : 'not checked') + '</div><div class="meta">' + (last ? badge(last.in_stock) + ' ' + Math.round(last.confidence * 100) + '% · ' + last.checked_at.slice(0, 16).replace('T', ' ') : '') + delta + '</div></div>'
        + '<div class="foot">' + sparkline(hist) + '<span><button class="btn quiet" data-check="' + p.id + '">Check now</button> <button class="btn quiet" data-remove="' + p.id + '">Remove</button></span></div>'
        + '</div>'
    }))
    list.innerHTML = items.join('')
  }

  document.getElementById('add').addEventListener('submit', async (e) => {
    e.preventDefault()
    const url = e.target.url.value.trim()
    status.textContent = 'Adding and checking, this takes a few seconds'
    const res = await fetch('/api/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) })
    const data = await res.json()
    if (!res.ok) { status.textContent = data.error; return }
    e.target.reset()
    await fetch('/api/products/' + data.product.id + '/check', { method: 'POST' })
    status.textContent = ''
    load()
  })

  list.addEventListener('click', async (e) => {
    const check = e.target.closest('[data-check]')
    const remove = e.target.closest('[data-remove]')
    if (check) {
      check.disabled = true
      status.textContent = 'Checking #' + check.dataset.check
      const res = await fetch('/api/products/' + check.dataset.check + '/check', { method: 'POST' })
      status.textContent = res.ok ? '' : (await res.json()).error
      load()
    }
    if (remove) {
      await fetch('/api/products/' + remove.dataset.remove, { method: 'DELETE' })
      load()
    }
  })

  load()
`

export const DASHBOARD_HTML = page(BODY, SCRIPT)
