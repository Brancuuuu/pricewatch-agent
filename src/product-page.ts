export const PRODUCT_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>pricewatch</title>
<style>
  :root { --ink: #07080b; --ink2: #0d0f14; --ink3: #141821; --line: rgba(255,255,255,.08); --mute: #8b9299; --chalk: #e9ecef; --crimson: #cd2543; --teal: #0fa99a; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--ink); color: var(--chalk); font: 15px/1.5 Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  main { max-width: 1100px; margin: 0 auto; padding: 40px 24px 60px; }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
  .brand { font-size: 22px; letter-spacing: .18em; text-transform: uppercase; font-weight: 700; color: var(--chalk); text-decoration: none; }
  .brand b { color: var(--crimson); }
  .back { color: var(--mute); text-decoration: none; font-size: 13px; }
  .back:hover { color: var(--teal); }
  h1 { margin: 0 0 6px; font-size: 24px; font-weight: 700; letter-spacing: -.01em; }
  .url { color: var(--mute); font-size: 12px; text-decoration: none; word-break: break-all; }
  .url:hover { color: var(--teal); }
  .hero { display: grid; grid-template-columns: 1fr auto; gap: 16px 32px; align-items: end; margin: 8px 0 22px; }
  .price { font-size: 40px; font-weight: 800; letter-spacing: -.03em; line-height: 1; text-align: right; }
  .meta { color: var(--mute); font-size: 13px; text-align: right; margin-top: 8px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 22px; }
  .stat { background: var(--ink2); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
  .stat b { display: block; font-size: 20px; font-weight: 800; letter-spacing: -.02em; }
  .stat span { color: var(--mute); font-size: 12px; letter-spacing: .06em; text-transform: uppercase; }
  .panel { background: var(--ink2); border: 1px solid var(--line); border-radius: 12px; padding: 18px 20px; margin-bottom: 14px; }
  .panel h2 { margin: 0 0 12px; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--mute); font-weight: 700; }
  .chart { width: 100%; overflow-x: auto; }
  svg { display: block; width: 100%; height: auto; }
  .axis { fill: var(--mute); font-size: 11px; }
  .grid { stroke: rgba(255,255,255,.06); }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; color: var(--mute); font-weight: 600; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; padding: 8px 10px; border-bottom: 1px solid var(--line); }
  td { padding: 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .quote { color: var(--mute); font-style: italic; }
  .ok { color: var(--teal); } .bad { color: var(--crimson); } .na { color: var(--mute); }
  button { background: var(--crimson); color: #fff; border: 0; padding: 12px 18px; border-radius: 8px; font: inherit; font-weight: 700; cursor: pointer; transition: background 300ms cubic-bezier(.4,.05,.2,1); }
  button:hover { background: var(--teal); }
  button:disabled { opacity: .5; cursor: progress; }
  .status { min-height: 20px; color: var(--mute); font-size: 13px; margin: 0 0 14px; }
  .empty { color: var(--mute); padding: 30px 0; text-align: center; }
  @media (max-width: 640px) { .hero { grid-template-columns: 1fr; } .price, .meta { text-align: left; } th:nth-child(5), td:nth-child(5) { display: none; } }
</style>
</head>
<body>
<main>
  <div class="top">
    <a class="brand" href="/"><b>price</b>watch</a>
    <a class="back" href="/">&larr; all products</a>
  </div>
  <div id="app"><div class="empty">Loading</div></div>
</main>
<script>
  const id = location.pathname.split('/').pop()
  const app = document.getElementById('app')
  const money = (p, c) => p === null || p === undefined ? 'no price' : p.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (c ? ' ' + c : '')
  const stockText = (s) => s === null ? 'unknown' : (s ? 'in stock' : 'out of stock')
  const stockClass = (s) => s === null ? 'na' : (s ? 'ok' : 'bad')
  const when = (iso) => iso.slice(0, 16).replace('T', ' ')
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])

  function chart(history) {
    const pts = history.filter((s) => s.price !== null)
    if (pts.length < 2) return '<div class="empty">The chart appears after the second check.</div>'
    const W = 1000, H = 260, L = 64, R = 16, T = 16, B = 36
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
    const color = last < first ? '#0fa99a' : last > first ? '#cd2543' : '#8b9299'
    const ticks = 4
    let out = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="price history">'
    for (let i = 0; i <= ticks; i++) {
      const v = min + ((max - min) * i) / ticks, yy = y(v)
      out += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/>'
      out += '<text class="axis" x="' + (L - 8) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end">' + v.toLocaleString('pl-PL', { maximumFractionDigits: v >= 100 ? 0 : 2 }) + '</text>'
    }
    const labels = [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]]
    labels.forEach((p, i) => {
      const anchor = i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'
      out += '<text class="axis" x="' + x(Date.parse(p.checked_at)).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="' + anchor + '">' + when(p.checked_at) + '</text>'
    })
    out += '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round"/>'
    for (const p of pts) {
      const fill = p.in_stock === false ? '#07080b' : color
      out += '<circle cx="' + x(Date.parse(p.checked_at)).toFixed(1) + '" cy="' + y(p.price).toFixed(1) + '" r="4" fill="' + fill + '" stroke="' + color + '" stroke-width="2"><title>' + esc(when(p.checked_at) + ' · ' + money(p.price, p.currency) + ' · ' + stockText(p.in_stock)) + '</title></circle>'
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
      + '<td class="' + stockClass(s.in_stock) + '">' + stockText(s.in_stock) + '</td>'
      + '<td class="num">' + Math.round(s.confidence * 100) + '%</td>'
      + '<td class="quote">' + esc(s.evidence || '') + '</td>'
      + '<td class="num">' + (s.input_tokens + s.output_tokens).toLocaleString('en') + '</td>'
      + '</tr>').join('')
    app.innerHTML = ''
      + '<h1>' + esc(product.name || 'Unnamed product') + '</h1>'
      + '<a class="url" href="' + esc(product.url) + '" target="_blank" rel="noopener">' + esc(product.url) + '</a>'
      + '<div class="hero"><div><div class="status" id="status"></div><button id="check">Check now</button></div>'
      + '<div><div class="price">' + (last ? money(last.price, last.currency) : 'not checked') + '</div><div class="meta">' + (last ? stockText(last.in_stock) + ' · confidence ' + Math.round(last.confidence * 100) + '% · ' + when(last.checked_at) : '') + '</div></div></div>'
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
</script>
</body>
</html>`
