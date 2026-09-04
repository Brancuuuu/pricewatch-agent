import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractProduct } from '../src/extract.js'
import type { ExtractInput } from '../src/extract.js'

interface EvalCase {
  name: string
  capturedAt: string
  page: ExtractInput
  expected: { price: number | null; currency: string | null; in_stock: boolean | null }
}

const dir = join(import.meta.dirname, 'cases')
const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
if (files.length === 0) {
  console.log('no cases in evals/cases, capture one with: npm run evals:capture -- <url>')
  process.exit(0)
}

const model = process.argv[2] || process.env.PRICEWATCH_MODEL || 'claude-haiku-4-5-20251001'
const rows: Array<Record<string, unknown>> = []
let passed = 0

for (const file of files) {
  const c = JSON.parse(readFileSync(join(dir, file), 'utf8')) as EvalCase
  const started = Date.now()
  const result = await extractProduct(c.page, model)
  const info = result.info
  const priceOk = info.price === c.expected.price || (info.price !== null && c.expected.price !== null && Math.abs(info.price - c.expected.price) < 0.01)
  const currencyOk = c.expected.currency === null || info.currency === c.expected.currency
  const stockOk = c.expected.in_stock === null || info.in_stock === c.expected.in_stock
  const ok = priceOk && currencyOk && stockOk
  if (ok) passed++
  rows.push({
    case: c.name,
    ok,
    expected: `${c.expected.price} ${c.expected.currency ?? ''}`.trim(),
    got: `${info.price} ${info.currency ?? ''}`.trim(),
    stock: `${c.expected.in_stock} / ${info.in_stock}`,
    confidence: info.confidence,
    tokens: result.inputTokens + result.outputTokens,
    ms: Date.now() - started,
  })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(28)} expected ${rows.at(-1)!.expected}  got ${rows.at(-1)!.got}  stock ${rows.at(-1)!.stock}  ${rows.at(-1)!.tokens} tok  ${rows.at(-1)!.ms} ms`)
}

const accuracy = Math.round((passed / files.length) * 100)
console.log(`\n${model}: ${passed}/${files.length} passed (${accuracy}%)`)
writeFileSync(join(import.meta.dirname, 'report.json'), JSON.stringify({ model, ranAt: new Date().toISOString(), accuracy, rows }, null, 2))
if (passed < files.length) process.exitCode = 1
