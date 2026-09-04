import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { capturePage, closeBrowser } from '../src/fetch.js'
import { collapseWhitespace, clip } from '../src/text.js'

const url = process.argv[2]
if (!url) {
  console.error('usage: npm run evals:capture -- <url> [case-name]')
  process.exit(1)
}
const name = process.argv[3] || new URL(url).hostname.replace(/^www\./, '')
const page = await capturePage(url)
await closeBrowser()

const file = join(import.meta.dirname, 'cases', `${name}.json`)
writeFileSync(
  file,
  JSON.stringify(
    {
      name,
      capturedAt: page.fetchedAt,
      page: { url: page.url, title: page.title, text: clip(collapseWhitespace(page.text), 20_000), hints: page.hints },
      expected: { price: null, currency: null, in_stock: null },
    },
    null,
    2,
  ),
)
console.log(`saved ${file}\nnow open it and fill in "expected"`)
