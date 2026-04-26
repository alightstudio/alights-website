import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const STASH_URLS = {
  150: 'https://www.xinpianchang.com/bookmark/2101287',
  151: 'https://www.xinpianchang.com/bookmark/2101064',
  152: 'https://www.xinpianchang.com/bookmark/2101002',
  153: 'https://www.xinpianchang.com/bookmark/2100975',
  154: 'https://www.xinpianchang.com/bookmark/2100918',
  155: 'https://www.xinpianchang.com/bookmark/2100883',
  156: 'https://www.xinpianchang.com/bookmark/2100863',
  157: 'https://www.xinpianchang.com/bookmark/2100829',
  158: 'https://www.xinpianchang.com/bookmark/2100781',
  159: 'https://www.xinpianchang.com/bookmark/2100738',
};

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

// Visit homepage first for cookies
await page.goto('https://www.xinpianchang.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(2000);

// Debug just stash 159 first
const url = STASH_URLS[159];
console.error(`Fetching ${url}...`);
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Check security
const title = await page.title();
if (title.includes('安全检测')) {
  console.error('Security check triggered!');
  await browser.close();
  process.exit(1);
}

const content = await page.content();
const match = content.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);

if (match) {
  const nd = JSON.parse(match[1]);
  // Dump the full structure of pageProps
  const pp = nd.props?.pageProps;
  if (pp) {
    const keys = Object.keys(pp);
    console.error('pageProps keys:', keys);
    for (const k of keys) {
      const v = pp[k];
      if (Array.isArray(v)) {
        console.error(`  ${k}: Array[${v.length}]`);
        if (v.length > 0) {
          console.error(`  [0] keys:`, Object.keys(v[0]));
          console.error(`  [0]:`, JSON.stringify(v[0]).substring(0, 500));
        }
      } else if (typeof v === 'object' && v !== null) {
        console.error(`  ${k}: Object keys:`, Object.keys(v));
        if (v.videoList) console.error(`  ${k}.videoList: Array[${v.videoList.length}]`);
        if (v.list) console.error(`  ${k}.list: Array[${v.list.length}]`);
      } else {
        console.error(`  ${k}: ${typeof v} = ${String(v).substring(0, 200)}`);
      }
    }
  }
  // Also dump query
  console.error('query:', JSON.stringify(nd.query));
  // Write full __NEXT_DATA__ for inspection
  writeFileSync('/tmp/next_data_debug.json', JSON.stringify(nd, null, 2));
  console.error('Full __NEXT_DATA__ written to /tmp/next_data_debug.json');
} else {
  console.error('No __NEXT_DATA__ found');
  // Try to find alternative data loading
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => s.textContent?.substring(0, 200)).filter(Boolean);
  });
  console.error('Scripts found:', scripts.length);
}

await browser.close();
