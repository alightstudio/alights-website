// Bypass security check for stashes 174-177
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browserURL = 'http://127.0.0.1:9222';

async function processStash(n, bookmarkId) {
  const browser = await puppeteer.connect({ browserURL });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes(String(bookmarkId)));
  
  if (!page) {
    page = await browser.newPage();
  }

  const url = `https://www.xinpianchang.com/bookmark/${bookmarkId}?from=userBookmark`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for security check to pass or page to load
  let title = await page.title();
  let waitCycles = 0;
  while (title === '安全检测中' && waitCycles < 30) {
    console.log(`stash${n}: security check... waiting (${waitCycles}s)`);
    await new Promise(r => setTimeout(r, 3000));
    
    // Try clicking refresh button if present
    try {
      await page.evaluate(() => {
        const btns = document.querySelectorAll('span, button, a');
        for (const b of btns) {
          if (b.textContent.includes('刷新') || b.textContent.includes('重试')) {
            b.click();
            return true;
          }
        }
        return false;
      });
    } catch(e) {}
    
    title = await page.title();
    waitCycles++;
  }

  if (title === '安全检测中') {
    console.log(`stash${n}: ❌ security check never passed`);
    await browser.disconnect();
    return false;
  }

  console.log(`stash${n}: page loaded (${title.slice(0, 50)})`);
  await new Promise(r => setTimeout(r, 4000));

  const freshData = await page.evaluate(() => {
    const nd = window.__NEXT_DATA__;
    if (!nd) return null;
    const list = nd.props.pageProps.detail.list;
    if (!list) return null;
    const result = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i].item;
      if (!item) continue;
      const c = item.count || {};
      result.push({
        id: item.id,
        count_view: c.count_view || 0,
        count_like: c.count_like || 0,
        count_collect: c.count_collect || 0,
        count_score: c.score || 0,
      });
    }
    return result;
  });

  if (!freshData) {
    console.log(`stash${n}: ❌ No __NEXT_DATA__`);
    await browser.disconnect();
    return false;
  }

  const file = `src/data/stash${n}.json`;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const freshMap = new Map(freshData.map(f => [f.id, f]));
  let updated = 0;
  for (const item of data) {
    const fresh = freshMap.get(item.id);
    if (fresh) {
      item.count_view = fresh.count_view;
      item.count_like = fresh.count_like;
      item.count_collect = fresh.count_collect;
      item.count_score = fresh.count_score;
      updated++;
    }
  }

  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`✅ stash${n}: ${updated}/${data.length} updated`);
  await browser.disconnect();
  return true;
}

async function main() {
  // 174-177
  for (const [n, id] of [['174', '2097422'], ['175', '2098799'], ['176', '2099029'], ['177', '2161140']]) {
    const ok = await processStash(n, id);
    if (!ok) console.log(`  → stash${n} needs manual bypass`);
    await new Promise(r => setTimeout(r, 2000));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
