// Debug: test API from detail page context
import puppeteer from 'puppeteer-core';

const browserURL = 'http://127.0.0.1:9222';

async function main() {
  const browser = await puppeteer.connect({ browserURL });
  const page = await browser.newPage();

  // Navigate to a detail page
  const artId = 13769616;
  await page.goto('https://www.xinpianchang.com/a' + artId + '?from=search', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));

  console.log('Page title:', await page.title());

  // Try different API paths
  const results = await page.evaluate(async (id) => {
    const tests = [
      '/api/xpc/v2/article/' + id,
      '/api/v1/xpc/article/' + id,
      '/api/article/' + id,
      '/article/' + id,
    ];
    const out = [];
    for (const path of tests) {
      try {
        const r = await fetch('https://www.xinpianchang.com' + path);
        const text = await r.text();
        const ok = !text.includes('_404') && !text.includes('not Found');
        out.push({ path, status: r.status, ok, preview: text.slice(0, 100) });
      } catch(e) {
        out.push({ path, error: e.message });
      }
    }
    return out;
  }, artId);

  results.forEach(r => console.log(JSON.stringify(r)));

  // Also check __NEXT_DATA__ for clue about API
  const nd = await page.evaluate(() => {
    const d = window.__NEXT_DATA__;
    if (!d) return null;
    // show keys at top level
    return Object.keys(d);
  });
  console.log('\n__NEXT_DATA__ keys:', nd);

  await browser.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
