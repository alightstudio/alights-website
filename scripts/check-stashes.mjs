// Check for new stashes + get stash IDs for refresh
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browserURL = 'http://127.0.0.1:9222';

async function main() {
  const browser = await puppeteer.connect({ browserURL });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('bookmark'));

  if (!page) {
    console.log('No bookmark page found, navigating...');
    page = await browser.newPage();
    await page.goto('https://www.xinpianchang.com/u12018057/bookmark', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));
  }

  // Click load-more multiple times to get all stash links
  for (let attempt = 0; attempt < 5; attempt++) {
    const clicked = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (let k = 0; k < btns.length; k++) {
        if (btns[k].textContent.trim() === '加载更多') {
          btns[k].click();
          return true;
        }
      }
      return false;
    });
    if (!clicked) break;
    console.log('Clicked load-more, waiting...');
    await new Promise(r => setTimeout(r, 5000));
  }

  // Extract all stash links
  const stashInfo = await page.evaluate(() => {
    const links = document.querySelectorAll('a');
    const result = {};
    for (let i = 0; i < links.length; i++) {
      const t = links[i].textContent.trim();
      const m = t.match(/^Stash\s+(\d+)$/);
      if (m) {
        const hrefM = links[i].href.match(/\/bookmark\/(\d+)/);
        if (hrefM) result[m[1]] = hrefM[1];
      }
    }
    return result;
  });

  console.log('\n=== All stashes found on NewPianChang ===');
  const nums = Object.keys(stashInfo).sort((a,b) => parseInt(a)-parseInt(b));
  console.log(nums.join(', '));
  console.log('Count:', nums.length);

  // Check against local files
  const localFiles = [];
  for (let key of nums) {
    if (fs.existsSync('src/data/stash' + key + '.json')) {
      localFiles.push(key);
    }
  }

  const missing = nums.filter(n => !localFiles.includes(n));
  console.log('\n=== Missing local files (need to scrape) ===');
  console.log(missing.length ? missing.join(', ') : 'None!');

  // Save stash IDs for refresh
  fs.writeFileSync('scripts/stash-ids.json', JSON.stringify(stashInfo, null, 2));
  console.log('\nSaved stash IDs to scripts/stash-ids.json');
  console.log('Total stashes on NPC:', nums.length);

  await browser.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
