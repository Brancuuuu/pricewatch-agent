export const DASHBOARD_HTML = `<!doctype html>
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
  header { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
  h1 { margin: 0; font-size: 22px; letter-spacing: .18em; text-transform: uppercase; }
  h1 b { color: var(--crimson); }
  .totals { color: var(--mute); font-size: 13px; }
  form { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
  input { flex: 1; min-width: 260px; background: var(--ink3); border: 1px solid var(--line); color: var(--chalk); padding: 12px 14px; border-radius: 8px; font: inherit; }
  button { background: var(--crimson); color: #fff; border: 0; padding: 12px 18px; border-radius: 8px; font: inherit; font-weight: 700; cursor: pointer; transition: background 300ms cubic-bezier(.4,.05,.2,1); }
  button:hover { background: var(--teal); }
  button.ghost { background: transparent; border: 1px solid var(--line); color: var(--mute); }
  button.ghost:hover { color: var(--chalk); border-color: var(--teal); background: transparent; }
  button:disabled { opacity: .5; cursor: progress; }
  .card { background: var(--ink2); border: 1px solid var(--line); border-radius: 12px; padding: 18px 20px; margin-bottom: 12px; display: grid; grid-template-columns: 1fr auto; gap: 8px 20px; align-items: center; }
  .card h2 { margin: 0 0 4px; font-size: 16px; font-weight: 600; }
  .card a { color: var(--mute); font-size: 12px; text-decoration: none; word-break: break-all; }
  .card a:hover { color: var(--teal); }
  .price { font-size: 24px; font-weight: 800; letter-spacing: -.02em; text-align: right; }
  .meta { color: var(--mute); font-size: 12px; text-align: right; }
  .meta .up { color: var(--crimson); } .meta .down { color: var(--teal); }
  .row { grid-column: 1 / -1; display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
  svg { display: block; }
  .empty { color: var(--mute); padding: 40px 0; text-align: center; }
  .status { min-height: 20px; color: var(--mute); font-size: 13px; margin-bottom: 14px; }
  @media (max-width: 640px) { .card { grid-template-columns: 1fr; } .price, .meta { text-align: left; } .row { justify-content: flex-start; } }
</style>
</head>
<body>
<main>
  <header>
    <h1><b>price</b>watch</h1>
    <div class="totals" id="totals"></div>
  </header>
  <form id="add">
    <input name="url" type="url" placeholder="https://shop.example/product-page" required>
    <button type="submit">Watch</button>
  </form>
  <div class="status" id="status"></div>
  <div id="list"><div class="empty">Loading</div></div>
</main>
<script>
  const list = document.getElementById('list')
  const status = document.getElementById('status')
  const totals = document.getElementById('totals')
  const money = (p, c) => p === null || p === undefined ? 'no price' : p.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (c ? ' ' + c : '')
  const stock = (s) => s === null || s === undefined ? 'stock unknown' : (s ? 'in stock' : 'out of stock')

  function sparkline(points) {
    const prices = points.map((p) => p.price).filter((p) => p !== null)
    if (prices.length < 2) return ''
    const w = 220, h = 44, min = Math.min(...prices), max = Math.max(...prices)
    const x = (i) => (i / (prices.length - 1)) * (w - 4) + 2
    const y = (p) => max === min ? h / 2 : h - 4 - ((p - min) / (max - min)) * (h - 8)
    const d = prices.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p).toFixed(1)).join(' ')
    const last = prices[prices.length - 1], first = prices[0]
    const color = last < first ? '#0fa99a' : last > first ? '#cd2543' : '#8b9299'
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/></svg>'
  }

  async function load() {
    const res = await fetch('/api/products')
    const data = await res.json()
    totals.textContent = data.totals.products + ' products, ' + data.totals.snapshots + ' checks, ' + (data.totals.input_tokens + data.totals.output_tokens).toLocaleString('en') + ' tokens used'
    if (!data.products.length) { list.innerHTML = '<div class="empty">Nothing watched yet. Paste a product URL above.</div>'; return }
    const cards = await Promise.all(data.products.map(async (p) => {
      const hist = (await (await fetch('/api/products/' + p.id)).json()).history
      const prev = hist.length > 1 ? hist[hist.length - 2] : null
      const last = p.last
      let delta = ''
      if (prev && last && prev.price !== null && last.price !== null && prev.price !== last.price) {
        const diff = last.price - prev.price
        delta = '<span class="' + (diff > 0 ? 'up' : 'down') + '">' + (diff > 0 ? '+' : '') + money(diff, last.currency) + '</span> since previous check'
      }
      return '<div class="card" data-id="' + p.id + '">'
        + '<div><h2>' + escapeHtml(p.name || 'Unnamed product') + '</h2><a href="' + escapeAttr(p.url) + '" target="_blank" rel="noopener">' + escapeHtml(p.url) + '</a></div>'
        + '<div><div class="price">' + (last ? money(last.price, last.currency) : 'not checked') + '</div><div class="meta">' + (last ? stock(last.in_stock) + ' · ' + Math.round(last.confidence * 100) + '% · ' + last.checked_at.slice(0, 16).replace('T', ' ') : '') + (delta ? '<br>' + delta : '') + '</div></div>'
        + '<div class="row">' + sparkline(hist) + '<span><button class="ghost" data-check="' + p.id + '">Check now</button> <button class="ghost" data-remove="' + p.id + '">Remove</button></span></div>'
        + '</div>'
    }))
    list.innerHTML = cards.join('')
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]) }
  function escapeAttr(s) { return escapeHtml(s) }

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
</script>
</body>
</html>`
