import { writeFileSync } from 'fs';
const CDP = await import('playwright-core').then(m => m.chromium);
const browser = await CDP.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0] || await browser.newContext();
const page = await context.newPage();

// Just fetch stash 159 to inspect data structure
await page.goto('https://www.xinpianchang.com/bookmark/2100738', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(5000);

// Dump pageProps.detail fully
const data = await page.evaluate(() => {
  const el = document.getElementById('__NEXT_DATA__');
  if (!el) return null;
  const nd = JSON.parse(el.textContent);
  return nd.props?.pageProps;
});

if (data) {
  console.error('pageProps keys:', Object.keys(data));
  
  // Check detail
  if (data.detail) {
    const detail = data.detail;
    console.error('detail type:', typeof detail);
    if (typeof detail === 'object') {
      console.error('detail keys:', Object.keys(detail).slice(0, 20));
      // Look for videoList or similar
      for (const k of Object.keys(detail)) {
        const v = detail[k];
        if (Array.isArray(v)) {
          console.error(`  detail.${k}: Array[${v.length}]`);
          if (v.length > 0 && typeof v[0] === 'object') {
            console.error(`    [0] keys:`, Object.keys(v[0]).slice(0, 15));
            console.error(`    [0]:`, JSON.stringify(v[0])?.substring(0, 500));
          }
        }
      }
    }
  }
  
  // Dump full pageProps for inspection
  writeFileSync('/tmp/stash159-pageprops.json', JSON.stringify(data, null, 2));
  console.error('Dumped to /tmp/stash159-pageprops.json');
}

await page.close();
