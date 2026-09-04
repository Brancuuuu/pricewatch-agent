import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`)
  }
  return value
}

export const config = {
  get apiKey(): string {
    return required('ANTHROPIC_API_KEY')
  },
  model: process.env.PRICEWATCH_MODEL || 'claude-haiku-4-5-20251001',
  dbPath: process.env.PRICEWATCH_DB || './data/pricewatch.db',
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  port: Number(process.env.PORT) || 8790,
  watchIntervalMinutes: Number(process.env.WATCH_INTERVAL_MINUTES) || 60,
  pageTimeoutMs: Number(process.env.PAGE_TIMEOUT_MS) || 30_000,
  maxPageChars: Number(process.env.MAX_PAGE_CHARS) || 12_000,
}
