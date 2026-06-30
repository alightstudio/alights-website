// Quick refresh stashes 174-177 using current Chrome tab
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browserURL = 'http://127.0.0.1:9222';

async function refresh(n, bookmarkId) {
  const browser = await puppeteer.connect({ browserURL });
  const page = await browser.newPage();
  
  const url = `https://www.xinpianchang.com/bookmark/${bookmarkId}?from=userBookmark`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  const title = await page.title();
  console.log(`stash${n}: ${title.slice(0, 60)}`);

  if (title.includes('安全检测')) {
    console.log(`  ❌ 安全检测中`);
    await page.close();
    await browser.disconnect();
    return false;
  }

  const freshData = await page.evaluate(() => {
    const nd = window.__NEXT_DATA__;
    if (!nd) return null;
    const list = nd.props.pageProps.detail.list;
    if (!list || !list.length) return null;
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

  await page.close();

  if (!freshData) {
    console.log(`  ❌ No __NEXT_DATA__`);
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
  console.log(`  ✅ ${updated}/${data.length} updated`);

  await browser.disconnect();
  return true;
}

async function main() {
  const stashes = [
    ['174', '2097422'],
    ['175', '2098799'],
    ['176', '2099029'],
    ['177', '2161140'],
  ];
  
  for (const [n, id] of stashes) {
    const file = `src/data/stash${n}.json`;
    if (!fs.existsSync(file)) {
      console.log(`stash${n} — no file, skipping`);
      continue;
    }
    const ok = await refresh(n, id);
    if (!ok) console.log(`  → stash${n} needs manual bypass`);
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
