import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP_URL = 'http://127.0.0.1:9222';
const OUT_DIR = 'src/data';

const STASHES = {
  105: 2236377, 106: 2236356, 107: 2235062,
  108: 2233467, 109: 2229189, 110: 2225098,
};

async function extractStash(browser, stashNum, bookmarkId) {
  const url = `https://www.xinpianchang.com/bookmark/${bookmarkId}?from=userBookmark`;
  console.log(`\n📦 Stash ${stashNum} (ID: ${bookmarkId})`);

  for (let attempt = 0; attempt < 3; attempt++) {
    const page = await browser.newPage();
    try {
      console.log(`  Attempt ${attempt + 1}: navigating...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise(r => setTimeout(r, 6000 + attempt * 3000));

      // Check if we got __NEXT_DATA__ with detail.list
      const valid = await page.evaluate(() => {
        var d = window.__NEXT_DATA__;
        if (!d) return false;
        var detail = d.props.pageProps.detail;
        return detail && Array.isArray(detail.list) && detail.list.length > 0;
      });

      if (!valid) {
        const title = await page.evaluate(() => document.title);
        console.log(`  ⚠️ No valid data. Title: "${title}"`);
        await page.close();
        continue;
      }

      // Extract
      const items = await page.evaluate(() => {
        var list = window.__NEXT_DATA__.props.pageProps.detail.list;
        var result = [];
        for (var i = 0; i < list.length; i++) {
          var item = list[i].item;
          var author = item.author;
          var authorStr = '未知';
          if (author) {
            if (author.userinfo && author.userinfo.username) authorStr = author.userinfo.username;
            else if (typeof author === 'string') authorStr = author;
          }
          var categories = item.categories;
          var catStr = '';
          if (categories && categories.length > 0) {
            if (typeof categories[0] === 'object' && categories[0].category_name) catStr = categories[0].category_name;
            else if (typeof categories[0] === 'object' && categories[0].name) catStr = categories[0].name;
            else if (typeof categories[0] === 'string') catStr = categories[0];
          }
          var count = item.count || {};
          result.push({
            id: item.id,
            title: item.title || '未命名',
            cover: item.cover || '',
            duration: item.duration || 0,
            count_view: count.count_view || 0,
            count_like: count.count_like || 0,
            count_collect: count.count_collect || 0,
            count_score: count.score || 0,
            author: authorStr,
            categories: catStr,
            web_url: item.web_url || '',
            publish_time: item.publish_time || 0
          });
        }
        return result;
      });

      console.log(`  ✅ ${items.length} items extracted`);
      fs.writeFileSync(`${OUT_DIR}/stash${stashNum}.json`, JSON.stringify(items, null, 2));
      console.log(`  💾 Saved`);
      await page.close();
      return true;
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      await page.close().catch(() => {});
    }
  }
  return false;
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL });

  for (const [num, id] of Object.entries(STASHES)) {
    const ok = await extractStash(browser, parseInt(num), id);
    if (!ok) console.log(`  ❌ FAILED for stash ${num}`);
    // Delay between stashes to avoid rate limiting
    await new Promise(r => setTimeout(r, 3000));
  }

  await browser.disconnect();
  console.log('\n✅ Done!');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
