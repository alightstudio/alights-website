// Try harder to load all stash links from bookmark page
import puppeteer from 'puppeteer-core';

const browserURL = 'http://127.0.0.1:9222';

async function main() {
  const browser = await puppeteer.connect({ browserURL });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('bookmark'));

  if (!page) {
    page = await browser.newPage();
    await page.goto('https://www.xinpianchang.com/u12018057/bookmark', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
  }

  // Reload if on a detail page
  if (page.url().includes('bookmark/')) {
    await page.goto('https://www.xinpianchang.com/u12018057/bookmark', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
  }

  console.log('Starting page:', page.url());

  // Keep clicking load-more until it disappears
  for (let attempt = 0; attempt < 15; attempt++) {
    const clicked = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (let k = 0; k < btns.length; k++) {
        if (btns[k].textContent.trim() === '加载更多') {
          btns[k].scrollIntoView({ block: 'center' });
          btns[k].click();
          return true;
        }
      }
      return false;
    });
    if (!clicked) {
      console.log(`No more load-more button after ${attempt} attempts`);
      break;
    }
    console.log(`Load-more attempt ${attempt + 1}`);
    await new Promise(r => setTimeout(r, 5000));
  }

  // Extract all stashes
  const stashes = await page.evaluate(() => {
    const links = document.querySelectorAll('a');
    const results = {};
    for (let i = 0; i < links.length; i++) {
      const t = links[i].textContent.trim();
      const m = t.match(/^Stash\s+(\d+)$/);
      if (m) {
        const hrefM = links[i].href.match(/\/bookmark\/(\d+)/);
        if (hrefM) results[m[1]] = hrefM[1];
      }
    }
    return results;
  });

  const nums = Object.keys(stashes).sort((a,b) => parseInt(a)-parseInt(b));
  console.log('\nTotal stashes found:', nums.length);
  console.log('Range:', nums[0], '-', nums[nums.length-1]);
  
  // Show gaps
  const all = [];
  for (let n = parseInt(nums[0]); n <= parseInt(nums[nums.length-1]); n++) {
    all.push(n);
  }
  const missing = all.filter(n => !stashes[String(n)]);
  console.log('\nGaps:', missing.join(', '));

  // Save updated stash IDs
  const fs = await import('fs');
  fs.writeFileSync('scripts/stash-ids.json', JSON.stringify(stashes, null, 2));
  console.log('\nUpdated stash-ids.json with', Object.keys(stashes).length, 'stashes');

  await browser.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
