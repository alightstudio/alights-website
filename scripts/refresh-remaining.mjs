// Refresh stashes 88-177 (the ones that weren't covered before)
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browserURL = 'http://127.0.0.1:9222';
const DATA_DIR = 'src/data/';

async function main() {
  const browser = await puppeteer.connect({ browserURL });
  const stashIds = JSON.parse(fs.readFileSync('scripts/stash-ids.json', 'utf8'));
  console.log('Stash IDs loaded:', Object.keys(stashIds).length);

  let totalUpdated = 0;

  // Focus on stashes that were skipped earlier: 116-120, 122-123, 125-177
  // Also include 88-89 since they weren't refreshed
  const targets = [];
  for (let n = 88; n <= 177; n++) {
    // Skip 90-115, 121, 124 — already done
    if ((n >= 90 && n <= 115) || n === 121 || n === 124) continue;
    if (stashIds[String(n)]) targets.push(n);
  }

  console.log('Targets:', targets.join(', '));
  console.log('Count:', targets.length);

  let updatedStashes = 0;
  let skippedStashes = 0;
  const failedStashes = [];

  for (const n of targets) {
    const file = DATA_DIR + 'stash' + n + '.json';
    if (!fs.existsSync(file)) {
      console.log(`⏭ stash${n} — no JSON file`);
      skippedStashes++;
      continue;
    }

    const npcId = stashIds[String(n)];
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data.length) {
      console.log(`⏭ stash${n} — empty`);
      skippedStashes++;
      continue;
    }

    const url = `https://www.xinpianchang.com/bookmark/${npcId}?from=userBookmark`;
    
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
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

      await page.close();

      if (!freshData) {
        console.log(`❌ stash${n} — no __NEXT_DATA__`);
        failedStashes.push(n);
        continue;
      }

      let updated = 0;
      const freshMap = new Map(freshData.map(f => [f.id, f]));
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
      updatedStashes++;
      totalUpdated += updated;

    } catch (e) {
      console.log(`❌ stash${n}: ${e.message}`);
      failedStashes.push(n);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${updatedStashes} stashes, ${totalUpdated} items`);
  console.log(`Skipped (no file): ${skippedStashes}`);
  if (failedStashes.length) console.log(`Failed: ${failedStashes.join(', ')}`);

  await browser.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
