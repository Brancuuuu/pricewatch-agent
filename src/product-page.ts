import { page } from './ui.js'

const BODY = `
<style>
  .back { display: inline-block; margin-bottom: 14px; color: var(--muted); text-decoration: none; font-size: 13px; }
  .back:hover { color: var(--ink); }
  h1 { margin: 0 0 4px; font-size: 24px; font-weight: 800; letter-spacing: -.02em; }
  .url { color: var(--muted); font-size: 12px; text-decoration: none; word-break: break-all; }
  .url:hover { color: var(--accent-dark); }
  .hero { display: grid; grid-template-columns: 1fr auto; gap: 16px 32px; align-items: end; margin: 10px 0 22px; }
  .hero .price { font-size: 40px; line-height: 1; text-align: right; }
  .hero .meta { color: var(--muted); font-size: 13px; text-align: right; margin-top: 8px; }
  .chart { width: 100%; }
  .chart svg { display: block; width: 100%; height: auto; }
  .axis { fill: #6b7280; font-size: 11px; font-family: var(--mono); }
  .grid { stroke: #ece8df; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; color: var(--muted); font-weight: 600; font-size: 12px; padding: 8px 10px; border-bottom: 1px solid var(--line); }
  td { padding: 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  td.num { text-align: right; white-space: nowrap; font-family: var(--mono); }
  .quote { color: var(--muted); font-style: italic; }
  @media (max-width: 640px) { .hero { grid-template-columns: 1fr; } .hero .price, .hero .meta { text-align: left; } th:nth-child(5), td:nth-child(5) { display: none; } }
</style>
<a class="back" href="/">&larr; all products</a>
<div id="app"><div class="empty">Loading</div></div>
`

const SCRIPT = `
  const id = location.pathname.split('/').pop()
  const app = document.getElementById('app')
  const money = (p, c) => p === null || p === undefined ? 'no price' : p.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (c ? ' ' + c : '')
  const badge = (s) => s === null ? '<span class="badge na">unknown</span>' : (s ? '<span class="badge in">in stock</span>' : '<span class="badge out">out of stock</span>')
  const when = (iso) => iso.slice(0, 16).replace('T', ' ')
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])

  function chart(history) {
    const pts = history.filter((s) => s.price !== null)
    if (pts.length < 2) return '<div class="empty">The chart appears after the second check.</div>'
    const W = 1000, H = 260, L = 70, R = 16, T = 16, B = 36
    const prices = pts.map((p) => p.price)
    let min = Math.min(...prices), max = Math.max(...prices)
    if (max === min) { min = min * 0.98; max = max * 1.02 }
    const pad = (max - min) * 0.1
    min -= pad; max += pad
    const t0 = Date.parse(pts[0].checked_at), t1 = Date.parse(pts[pts.length - 1].checked_at)
    const x = (t) => t1 === t0 ? L + (W - L - R) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - R)
    const y = (p) => T + (1 - (p - min) / (max - min)) * (H - T - B)
    const path = pts.map((p, i) => (i ? 'L' : 'M') + x(Date.parse(p.checked_at)).toFixed(1) + ' ' + y(p.price).toFixed(1)).join(' ')
    const first = pts[0].price, last = pts[pts.length - 1].price
    const color = last < first ? '#1a7f4b' : last > first ? '#b42318' : '#152238'
    let out = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="price history">'
    for (let i = 0; i <= 4; i++) {
      const v = min + ((max - min) * i) / 4, yy = y(v)
      out += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/>'
      out += '<text class="axis" x="' + (L - 8) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end">' + v.toLocaleString('pl-PL', { maximumFractionDigits: v >= 100 ? 0 : 2 }) + '</text>'
    }
    const mid = pts[Math.floor(pts.length / 2)]
    const midX = x(Date.parse(mid.checked_at))
    const labels = midX - L > 140 && W - R - midX > 140 ? [pts[0], mid, pts[pts.length - 1]] : [pts[0], pts[pts.length - 1]]
    labels.forEach((p, i) => {
      const anchor = i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'
      out += '<text class="axis" x="' + x(Date.parse(p.checked_at)).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="' + anchor + '">' + when(p.checked_at) + '</text>'
    })
    out += '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round"/>'
    for (const p of pts) {
      const fill = p.in_stock === false ? '#ffffff' : color
      out += '<circle cx="' + x(Date.parse(p.checked_at)).toFixed(1) + '" cy="' + y(p.price).toFixed(1) + '" r="4.5" fill="' + fill + '" stroke="' + color + '" stroke-width="2"><title>' + esc(when(p.checked_at) + ' · ' + money(p.price, p.currency)) + '</title></circle>'
    }
    return out + '</svg>'
  }

  async function load() {
    const res = await fetch('/api/products/' + id)
    if (!res.ok) { app.innerHTML = '<div class="empty">Product not found.</div>'; return }
    const { product, history } = await res.json()
    const last = history[history.length - 1]
    const priced = history.filter((s) => s.price !== null).map((s) => s.price)
    const tokens = history.reduce((a, s) => a + s.input_tokens + s.output_tokens, 0)
    const rows = history.slice().reverse().map((s) => '<tr>'
      + '<td>' + when(s.checked_at) + '</td>'
      + '<td class="num">' + money(s.price, s.currency) + '</td>'
      + '<td>' + badge(s.in_stock) + '</td>'
      + '<td class="num">' + Math.round(s.confidence * 100) + '%</td>'
      + '<td class="quote">' + esc(s.evidence || '') + '</td>'
      + '<td class="num">' + (s.input_tokens + s.output_tokens).toLocaleString('en') + '</td>'
      + '</tr>').join('')
    app.innerHTML = ''
      + '<h1>' + esc(product.name || 'Unnamed product') + '</h1>'
      + '<a class="url" href="' + esc(product.url) + '" target="_blank" rel="noopener">' + esc(product.url) + '</a>'
      + '<div class="hero"><div><div class="status" id="status"></div><button class="btn" id="check">Check now</button></div>'
      + '<div><div class="price">' + (last ? money(last.price, last.currency) : 'not checked') + '</div><div class="meta">' + (last ? badge(last.in_stock) + ' confidence ' + Math.round(last.confidence * 100) + '% · ' + when(last.checked_at) : '') + '</div></div></div>'
      + '<div class="stats">'
      + '<div class="stat"><b>' + history.length + '</b><span>checks</span></div>'
      + '<div class="stat"><b>' + (priced.length ? money(Math.min(...priced), last.currency) : '-') + '</b><span>lowest</span></div>'
      + '<div class="stat"><b>' + (priced.length ? money(Math.max(...priced), last.currency) : '-') + '</b><span>highest</span></div>'
      + '<div class="stat"><b>' + (history[0] ? when(history[0].checked_at).slice(0, 10) : '-') + '</b><span>watched since</span></div>'
      + '<div class="stat"><b>' + tokens.toLocaleString('en') + '</b><span>tokens used</span></div>'
      + '</div>'
      + '<div class="panel"><h2>Price history</h2><div class="chart">' + chart(history) + '</div></div>'
      + '<div class="panel"><h2>Every check</h2><table><thead><tr><th>Time</th><th>Price</th><th>Stock</th><th>Conf.</th><th>Evidence quoted by the model</th><th>Tokens</th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" class="empty">No checks yet.</td></tr>') + '</tbody></table></div>'
    document.getElementById('check').addEventListener('click', async (e) => {
      e.target.disabled = true
      document.getElementById('status').textContent = 'Fetching the page and asking the model'
      const r = await fetch('/api/products/' + id + '/check', { method: 'POST' })
      if (!r.ok) document.getElementById('status').textContent = (await r.json()).error
      load()
    })
  }

  load()
`

export const PRODUCT_HTML = page(BODY, SCRIPT)
