import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const pages = await browser.pages();
let page = pages[0]; // use existing page

// Navigate to bookmark list
await page.goto('https://www.xinpianchang.com/u12018057/bookmark', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await new Promise(r => setTimeout(r, 4000));

// Extract all stash links and IDs
const stashLinks = await page.evaluate(() => {
  var links = document.querySelectorAll('a');
  var result = [];
  for (var i = 0; i < links.length; i++) {
    var text = links[i].textContent.trim();
    var href = links[i].href;
    var match = text.match(/^Stash (\d+)$/);
    if (match && href && href.indexOf('/bookmark/') !== -1) {
      var idMatch = href.match(/\/bookmark\/(\d+)/);
      result.push({ name: match[1], bookmarkId: idMatch ? idMatch[1] : 'unknown', href: href });
    }
  }
  return result;
});

console.log(`找到 ${stashLinks.length} 个 Stash 链接`);
stashLinks.forEach(s => console.log(`  Stash ${s.name} -> ID ${s.bookmarkId}`));

// Filter for 120-129
const target = stashLinks.filter(s => parseInt(s.name) >= 120 && parseInt(s.name) <= 129);
console.log(`\nStash 120-129 (${target.length}个):`);
target.forEach(s => console.log(`  Stash ${s.name}: ID=${s.bookmarkId}`));

await browser.disconnect();
