export const LOGO_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="34" height="34" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="16" fill="#152238"/><circle cx="32" cy="32" r="19" fill="none" stroke="#f0620d" stroke-width="3"/><polyline points="17,35 24,35 28,24 34,44 38,31 41,35 47,35" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const FAVICON = 'data:image/svg+xml,' + encodeURIComponent(LOGO_MARK.replace(' width="34" height="34" aria-hidden="true"', ''))

export const BASE_CSS = `
  :root {
    --bg: #f6f3ec; --surface: #ffffff; --ink: #1b1f2a; --muted: #6b7280; --line: #e5e0d6;
    --accent: #f0620d; --accent-dark: #c94f05; --navy: #152238; --navy-soft: #1f3355;
    --up: #b42318; --down: #1a7f4b;
    --mono: ui-monospace, "JetBrains Mono", "Cascadia Mono", Consolas, "Courier New", monospace;
  }
  * { box-sizing: border-box; }
  html { background: var(--bg); }
  body { margin: 0; color: var(--ink); font: 15px/1.55 "Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif; }
  a { color: inherit; }
  .top { background: var(--navy); color: #fff; }
  .top .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 24px; }
  .wrap { max-width: 1080px; margin: 0 auto; }
  .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: #fff; font-size: 21px; font-weight: 800; letter-spacing: -.03em; }
  .brand em { font-style: normal; color: var(--accent); }
  .top nav { display: flex; gap: 18px; font-size: 13px; }
  .top nav a { color: rgba(255,255,255,.75); text-decoration: none; }
  .top nav a:hover { color: #fff; }
  main { padding: 28px 24px 56px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(122px, 1fr)); gap: 10px; margin-bottom: 22px; }
  .stat { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; }
  .stat b { display: block; font-family: var(--mono); font-size: 22px; font-weight: 700; letter-spacing: -.02em; }
  .stat span { display: block; margin-top: 2px; color: var(--muted); font-size: 12px; }
  .stat small { color: var(--muted); font-size: 12px; font-weight: 500; font-family: inherit; white-space: nowrap; }
  .btn { display: inline-flex; align-items: center; gap: 8px; background: var(--accent); color: #fff; border: 0; border-radius: 999px; padding: 11px 20px; font: inherit; font-weight: 700; cursor: pointer; transition: background 200ms ease; text-decoration: none; }
  .btn:hover { background: var(--accent-dark); }
  .btn.quiet { background: var(--surface); color: var(--ink); border: 1px solid var(--line); }
  .btn.quiet:hover { background: var(--bg); border-color: #cfc8bb; }
  .btn:disabled { opacity: .55; cursor: progress; }
  .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; margin-bottom: 14px; }
  .panel h2 { margin: 0 0 12px; font-size: 13px; font-weight: 700; color: var(--muted); }
  .price { font-family: var(--mono); font-weight: 700; letter-spacing: -.02em; }
  .badge { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge.in { background: #e3f3ea; color: var(--down); }
  .badge.out { background: #fbe9e6; color: var(--up); }
  .badge.na { background: #efebe3; color: var(--muted); }
  .up { color: var(--up); } .down { color: var(--down); }
  .muted { color: var(--muted); }
  .status { min-height: 20px; color: var(--muted); font-size: 13px; margin: 0 0 12px; }
  .empty { color: var(--muted); padding: 36px 0; text-align: center; }
  footer { border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; }
  footer .wrap { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 16px 24px; }
  footer a { color: var(--muted); }
  footer a:hover { color: var(--ink); }
`

export function page(body: string, script: string, nav = ''): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>pricewatch</title>
<link rel="icon" href="${FAVICON}">
<style>${BASE_CSS}</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="/">${LOGO_MARK}<span>price<em>watch</em></span></a>
  <nav>${nav}<a href="/api/products">API</a><a href="https://github.com/Brancuuuu/pricewatch-agent" target="_blank" rel="noopener">GitHub</a></nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer><div class="wrap">
  <span>pricewatch, MIT license</span>
  <span>made by <a href="https://ravdev.pl" target="_blank" rel="noopener">Rafał Branc</a></span>
</div></footer>
<script>
${script}
</script>
</body>
</html>`
}
