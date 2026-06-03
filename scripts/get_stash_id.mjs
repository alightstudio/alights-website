import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const pages = await browser.pages();
const page = pages.find(p => p.url().includes('bookmark'));

const href = await page.evaluate(() => {
  const links = document.querySelectorAll('a');
  for (const a of links) {
    if (a.textContent.trim() === 'Stash 177') return a.href;
  }
  return null;
});
console.log('Stash 177 href:', href);

if (href) {
  const match = href.match(/\/bookmark\/(\d+)/);
  console.log('bookmark_id:', match ? match[1] : 'unknown');
}
await browser.disconnect();
