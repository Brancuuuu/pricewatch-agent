import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { config } from './config.js'
import { buildModelInput } from './text.js'
import type { PageHints } from './text.js'

export const ProductInfoSchema = z.object({
  name: z.string().nullable().describe('Product name as shown on the page, without the shop name'),
  price: z.number().nullable().describe('Current selling price as a plain number, after any discount. null if not on the page'),
  currency: z.string().nullable().describe('ISO 4217 code such as PLN, EUR, USD. null if unknown'),
  in_stock: z.boolean().nullable().describe('true if the product can be bought now, false if clearly unavailable, null if the page does not say'),
  confidence: z.number().describe('0 to 1, how sure you are about the price'),
  evidence: z.string().nullable().describe('Shortest quote from the input that shows the price'),
})

export type ProductInfo = z.infer<typeof ProductInfoSchema>

export interface ExtractionResult {
  info: ProductInfo
  model: string
  inputTokens: number
  outputTokens: number
}

export const SYSTEM_PROMPT = `You extract offer data from the text of a single online shop page.

Rules:
- Use only what is in the input. Never guess or invent a price.
- The page describes one main product (see TITLE and STRUCTURED HINTS). Ignore prices of other products such as "customers also bought", accessories, bundles or delivery costs.
- price is the current selling price the customer pays now. When an old price and a discounted price are both shown, return the discounted one.
- Prefer STRUCTURED HINTS (JSON-LD, meta tags) when they describe the same product as the page text.
- Write the price as a plain decimal number: "1 299,99 zł" becomes 1299.99.
- currency is the ISO 4217 code: zł is PLN.
- in_stock is true only when the page says the product is available or can be added to the cart, false when it is clearly out of stock, null otherwise.
- If the price is not present, set price to null and confidence to 0.
- evidence is the shortest quote from the input that shows the price, or null.`

export interface ExtractInput {
  url: string
  title: string
  text: string
  hints: PageHints
}

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: config.apiKey })
  return client
}

function normalize(info: ProductInfo): ProductInfo {
  return {
    ...info,
    currency: info.currency ? info.currency.trim().toUpperCase().replace(/^ZŁ$|^ZL$/, 'PLN') : null,
    confidence: Math.min(1, Math.max(0, Number.isFinite(info.confidence) ? info.confidence : 0)),
    price: info.price !== null && Number.isFinite(info.price) && info.price >= 0 ? Math.round(info.price * 100) / 100 : null,
  }
}

export async function extractProduct(page: ExtractInput, model = config.model): Promise<ExtractionResult> {
  const input = buildModelInput(page, config.maxPageChars)
  const message = await getClient().messages.parse({
    model,
    max_tokens: 500,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: input }],
    output_config: { format: zodOutputFormat(ProductInfoSchema) },
  })
  if (!message.parsed_output) {
    throw new Error(`Model returned no structured output (stop_reason: ${message.stop_reason})`)
  }
  return {
    info: normalize(message.parsed_output),
    model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  }
}
