import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const pages = await browser.pages();
const page = pages.find(p => p.url().includes('bookmark'));

const raw = await page.evaluate(() => {
  try {
    var data = window.__NEXT_DATA__;
    var list = data.props.pageProps.detail.list;
    // Print first item's full structure
    var first = list[0];
    return JSON.stringify({
      keys_item: Object.keys(first.item),
      keys_count: first.item.count ? Object.keys(first.item.count) : 'no count',
      count: first.item.count,
      categories_raw: first.item.categories,
      sample_cats: first.item.categories ? first.item.categories.slice(0, 3) : null,
      sample_authors: first.item.author ? first.item.author : null,
      // Check a middle item too
      midCount: list[20].item.count,
      midAllKeys: Object.keys(list[20].item)
    });
  } catch(e) { return JSON.stringify({error: e.message}); }
});

console.log(raw);

await browser.disconnect();
