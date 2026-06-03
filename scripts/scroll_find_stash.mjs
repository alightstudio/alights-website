import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const pages = await browser.pages();
const page = pages[0];

await page.goto('https://www.xinpianchang.com/u12018057/bookmark', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await new Promise(r => setTimeout(r, 4000));

// Scroll down multiple times to trigger lazy loading
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); });
  await new Promise(r => setTimeout(r, 2000));
}

// Now extract ALL stash links
const stashLinks = await page.evaluate(() => {
  var links = document.querySelectorAll('a');
  var result = [];
  for (var i = 0; i < links.length; i++) {
    var text = links[i].textContent.trim();
    var href = links[i].href;
    var match = text.match(/^Stash (\d+)$/);
    if (match && href && href.indexOf('/bookmark/') !== -1) {
      var idMatch = href.match(/\/bookmark\/(\d+)/);
      result.push({ name: parseInt(match[1]), bookmarkId: idMatch ? idMatch[1] : 'unknown' });
    }
  }
  return result.sort((a,b) => a.name - b.name);
});

console.log(`找到 ${stashLinks.length} 个 Stash:`);
stashLinks.forEach(s => console.log(`  Stash ${s.name} -> ID ${s.bookmarkId}`));

// Filter for 124-129
const needed = [124, 125, 126, 127, 128, 129];
const found = stashLinks.filter(s => needed.includes(s.name));
const missing = needed.filter(n => !stashLinks.some(s => s.name === n));

if (found.length > 0) {
  console.log(`\n✅ 找到 ${found.length} 个 124-129:`);
  found.forEach(s => console.log(`  Stash ${s.name}: ID=${s.bookmarkId}`));
}
if (missing.length > 0) {
  console.log(`\n❌ 仍未找到: Stash ${missing.join(', ')}`);
}

await browser.disconnect();
