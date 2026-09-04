import { Command } from 'commander'
import { config } from './config.js'
import { Store } from './db.js'
import { closeBrowser } from './fetch.js'
import { formatPrice, notifyDiscord, stockLabel } from './notify.js'
import { checkAll, checkProduct, watchLoop, type CheckResult } from './watch.js'
import { startServer } from './server.js'

const program = new Command()
program.name('pricewatch').description('Watches product pages and alerts when the price changes').version('0.1.0')

function openStore(): Store {
  return new Store(config.dbPath)
}

function printResult(result: CheckResult): void {
  const { product, current, previous, changed } = result
  const name = product.name || product.url
  const line = [
    `#${product.id}`,
    name,
    formatPrice(current.price, current.currency),
    stockLabel(current.in_stock),
    `conf ${Math.round(current.confidence * 100)}%`,
    `${current.input_tokens}+${current.output_tokens} tok` + (current.cached_tokens ? ` (${current.cached_tokens} cached)` : ''),
  ].join('  |  ')
  console.log(line)
  if (changed && previous) console.log(`   was ${formatPrice(previous.price, previous.currency)} (${stockLabel(previous.in_stock)})`)
}

program
  .command('add')
  .argument('<url>', 'product page URL')
  .option('-n, --name <name>', 'name to show instead of the one read from the page')
  .option('--no-check', 'only save, do not fetch now')
  .description('add a product page to the watch list')
  .action(async (url: string, options: { name?: string; check: boolean }) => {
    const store = openStore()
    const product = store.addProduct(url, options.name ?? null)
    console.log(`#${product.id} added: ${product.url}`)
    if (options.check) {
      printResult(await checkProduct(store, product))
      await closeBrowser()
    }
    store.close()
  })

program
  .command('list')
  .option('--json', 'machine readable output')
  .description('list watched products with their last known price')
  .action((options: { json?: boolean }) => {
    const store = openStore()
    const rows = store.listProducts().map((product) => ({ product, last: store.lastSnapshot(product.id) }))
    if (options.json) {
      console.log(JSON.stringify(rows, null, 2))
    } else if (rows.length === 0) {
      console.log('no products yet, add one with: pricewatch add <url>')
    } else {
      for (const { product, last } of rows) {
        const price = last ? formatPrice(last.price, last.currency) : 'not checked yet'
        const stock = last ? stockLabel(last.in_stock) : ''
        const when = last ? last.checked_at.slice(0, 16).replace('T', ' ') : ''
        console.log(`#${product.id}  ${product.name || product.url}  |  ${price}  ${stock}  ${when}`.replace(/\s+$/, ''))
      }
    }
    store.close()
  })

program
  .command('remove')
  .argument('<id>', 'product id')
  .description('stop watching a product')
  .action((id: string) => {
    const store = openStore()
    console.log(store.removeProduct(Number(id)) ? `#${id} removed` : `#${id} not found`)
    store.close()
  })

program
  .command('check')
  .argument('[id]', 'product id, all products when omitted')
  .option('--json', 'machine readable output')
  .description('fetch the page(s) now and record the current price')
  .action(async (id: string | undefined, options: { json?: boolean }) => {
    const store = openStore()
    let results: CheckResult[]
    if (id) {
      const product = store.getProduct(Number(id))
      if (!product) {
        console.error(`#${id} not found`)
        process.exitCode = 1
        store.close()
        return
      }
      results = [await checkProduct(store, product)]
    } else {
      results = await checkAll(store)
    }
    await closeBrowser()
    if (options.json) console.log(JSON.stringify(results, null, 2))
    else results.forEach(printResult)
    store.close()
  })

program
  .command('alert-test')
  .description('send a sample price-change alert to the Discord webhook')
  .action(async () => {
    const store = openStore()
    const product = store.listProducts().find((p) => store.lastSnapshot(p.id))
    const current = product ? store.lastSnapshot(product.id) : undefined
    if (!product || !current || current.price === null) {
      console.error('add and check at least one product first')
      process.exitCode = 1
      store.close()
      return
    }
    const previous = { ...current, price: Math.round(current.price * 1.1 * 100) / 100, in_stock: true }
    const sent = await notifyDiscord({ product: { ...product, name: '[test] ' + (product.name || product.url) }, previous, current })
    console.log(sent ? 'alert sent, check the channel' : 'DISCORD_WEBHOOK_URL is not set in .env')
    store.close()
  })

program
  .command('watch')
  .option('-i, --interval <minutes>', 'minutes between rounds', String(config.watchIntervalMinutes))
  .description('check all products in a loop')
  .action(async (options: { interval: string }) => {
    await watchLoop(openStore(), Number(options.interval))
  })

program
  .command('serve')
  .option('-p, --port <port>', 'HTTP port', String(config.port))
  .description('start the dashboard and JSON API')
  .action((options: { port: string }) => {
    startServer(openStore(), Number(options.port))
  })

program.parseAsync(process.argv).catch((error: Error) => {
  console.error(error.message)
  process.exitCode = 1
})
