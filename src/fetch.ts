import { chromium, type Browser } from 'playwright'
import { config } from './config.js'
import type { PageHints } from './text.js'

export interface PageCapture {
  url: string
  finalUrl: string
  title: string
  text: string
  hints: PageHints
  fetchedAt: string
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 pricewatch-agent/0.1'

const BLOCKED_RESOURCES = new Set(['image', 'media', 'font'])

let browser: Browser | null = null

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) browser = await chromium.launch({ headless: true })
  return browser
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}

export async function capturePage(url: string, timeoutMs = config.pageTimeoutMs): Promise<PageCapture> {
  const context = await (await getBrowser()).newContext({
    userAgent: USER_AGENT,
    locale: 'pl-PL',
    viewport: { width: 1366, height: 900 },
  })
  await context.route('**/*', (route) => {
    if (BLOCKED_RESOURCES.has(route.request().resourceType())) return route.abort()
    return route.continue()
  })
  const page = await context.newPage()
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    await page.waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 10_000) }).catch(() => undefined)
    const data = await page.evaluate(() => {
      const jsonLd: unknown[] = []
      for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          jsonLd.push(JSON.parse(script.textContent || 'null'))
        } catch {}
      }
      const meta: Record<string, string> = {}
      for (const tag of document.querySelectorAll('meta[property], meta[name], meta[itemprop]')) {
        const key = tag.getAttribute('property') || tag.getAttribute('name') || tag.getAttribute('itemprop') || ''
        const value = tag.getAttribute('content') || ''
        if (key && value && value.length < 300) meta[key] = value
      }
      return { title: document.title, text: document.body ? document.body.innerText : '', jsonLd, meta }
    })
    return {
      url,
      finalUrl: page.url(),
      title: data.title,
      text: data.text,
      hints: { jsonLd: data.jsonLd, meta: data.meta },
      fetchedAt: new Date().toISOString(),
    }
  } finally {
    await context.close()
  }
}
