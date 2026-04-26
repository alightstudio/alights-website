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
await page.goto('https://www.xinpianchang.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(2000);

// Try stash 159
await page.goto('https://www.xinpianchang.com/bookmark/2100738', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);

const title = await page.title();
console.error('Page title:', title);

if (title.includes('安全检测')) {
  console.error('Security check - need headed mode');
  await browser.close();
  process.exit(1);
}

const content = await page.content();
const match = content.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);

if (match) {
  const nd = JSON.parse(match[1]);
  const pp = nd.props?.pageProps;
  if (pp) {
    console.error('pageProps keys:', Object.keys(pp));
    for (const k of Object.keys(pp)) {
      const v = pp[k];
      if (Array.isArray(v)) {
        console.error(`  ${k}: Array[${v.length}]`);
        if (v.length > 0) console.error(`    [0]:`, JSON.stringify(v[0]).substring(0, 300));
      } else if (typeof v === 'object' && v !== null) {
        const subKeys = Object.keys(v);
        console.error(`  ${k}: Object keys:`, subKeys);
        for (const sk of subKeys) {
          const sv = v[sk];
          if (Array.isArray(sv)) {
            console.error(`    ${k}.${sk}: Array[${sv.length}]`);
            if (sv.length > 0) console.error(`      [0]:`, JSON.stringify(sv[0]).substring(0, 300));
          }
        }
      } else {
        console.error(`  ${k}: ${typeof v}`);
      }
    }
  }
  writeFileSync('/tmp/next_data_debug.json', JSON.stringify(nd, null, 2));
  console.error('Dumped to /tmp/next_data_debug.json');
} else {
  console.error('No __NEXT_DATA__');
  // Check if it's an API-driven page (client-side)
  const hasFetchWorkList = await page.evaluate(() => {
    return typeof window.fetch === 'function';
  });
  console.error('Has fetch:', hasFetchWorkList);
  
  // Look for API calls
  page.on('response', resp => {
    if (resp.url().includes('api') || resp.url().includes('bookmark')) {
      console.error('API response:', resp.url(), resp.status());
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(5000);
}

await browser.close();
