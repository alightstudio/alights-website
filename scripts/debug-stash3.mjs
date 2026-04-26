import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'zh-CN',
  viewport: { width: 1920, height: 1080 },
});

await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
});

const page = await context.newPage();

// Capture ALL responses
const apiResponses = [];
page.on('response', async resp => {
  const url = resp.url();
  const status = resp.status();
  // Log any JSON API calls
  const ct = resp.headers()['content-type'] || '';
  if (ct.includes('json') || url.includes('api') || url.includes('bookmark') || url.includes('collection') || url.includes('video')) {
    try {
      const body = await resp.text();
      if (body.length < 50000) {
        apiResponses.push({ url, status, bodyLen: body.length, body: body.substring(0, 2000) });
      } else {
        apiResponses.push({ url, status, bodyLen: body.length, body: body.substring(0, 500) + '...[truncated]' });
      }
    } catch(e) {}
  }
});

await page.goto('https://www.xinpianchang.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(2000);

await page.goto('https://www.xinpianchang.com/bookmark/2100738', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(10000);

// Also scroll to trigger lazy loading
await page.evaluate(() => window.scrollTo(0, 5000));
await page.waitForTimeout(3000);
await page.evaluate(() => window.scrollTo(0, 10000));
await page.waitForTimeout(3000);

console.error(`Captured ${apiResponses.length} API responses:`);
for (const r of apiResponses) {
  console.error(`  [${r.status}] ${r.url} (${r.bodyLen} bytes)`);
  if (r.bodyLen > 50) console.error(`    ${r.body.substring(0, 300)}`);
}

// Also check what's actually rendered in the DOM
const domInfo = await page.evaluate(() => {
  const cards = document.querySelectorAll('[class*="video"], [class*="work"], [class*="item"], [class*="card"]');
  const links = document.querySelectorAll('a[href*="/a"]');
  return {
    cardsByClass: Array.from(cards).length,
    linksToWorks: Array.from(links).length,
    firstLinkHrefs: Array.from(links).slice(0, 5).map(a => a.href),
    bodyText: document.body?.innerText?.substring(0, 500),
  };
});
console.error('DOM info:', JSON.stringify(domInfo, null, 2));

await browser.close();
