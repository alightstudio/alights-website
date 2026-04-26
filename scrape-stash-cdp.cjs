const puppeteer = require('puppeteer-core');
const fs = require('fs');

const DATA_DIR = '/Users/lzc/.qclaw/workspace/alights-website/src/data';

const STASHES = [
  { id: 150, url: 'https://www.xinpianchang.com/bookmark/2101287' },
  { id: 151, url: 'https://www.xinpianchang.com/bookmark/2101064' },
  { id: 152, url: 'https://www.xinpianchang.com/bookmark/2101002' },
  { id: 153, url: 'https://www.xinpianchang.com/bookmark/2100975' },
  { id: 154, url: 'https://www.xinpianchang.com/bookmark/2100784' },
  { id: 155, url: 'https://www.xinpianchang.com/bookmark/2100627' },
  { id: 156, url: 'https://www.xinpianchang.com/bookmark/2100442' },
  { id: 157, url: 'https://www.xinpianchang.com/bookmark/2100350' },
  { id: 158, url: 'https://www.xinpianchang.com/bookmark/2100216' },
  { id: 159, url: 'https://www.xinpianchang.com/bookmark/2100212' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function extractWorks(page) {
  return await page.evaluate(() => {
    const nd = document.getElementById('__NEXT_DATA__');
    if (!nd) return null;
    const data = JSON.parse(nd.textContent);
    const detail = data.props?.pageProps?.detail;
    if (!detail || !detail.list) return null;

    return detail.list
      .filter(entry => entry.item && entry.item.id)
      .map(entry => {
        const w = entry.item;
        const c = w.count || {};
        return {
          id: w.id,
          title: w.title || '',
          cover: w.cover || '',
          web_url: w.web_url || '',
          duration: w.duration || 0,
          categories: (w.categories || []).map(cat => cat.category_name || '').join(','),
          count_view: c.count_view || 0,
          count_like: c.count_like || 0,
          count_collect: c.count_collect || 0,
          author: w.author?.userinfo?.username || '',
          publish_time: w.publish_time || 0,
        };
      })
      .filter(w => w.id > 0 && w.title);
  });
}

async function main() {
  console.log('Connecting to Chrome CDP...');
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });
  console.log('Connected!\n');

  const results = [];

  for (let i = 0; i < STASHES.length; i++) {
    const stash = STASHES[i];
    console.log(`[${i + 1}/${STASHES.length}] Stash ${stash.id}: ${stash.url}`);

    const page = await browser.newPage();
    try {
      await page.goto(stash.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(5000);

      let works = await extractWorks(page);

      if (!works || works.length === 0) {
        console.log('  No data — may need CAPTCHA, waiting...');
        for (let attempt = 1; attempt <= 6; attempt++) {
          await sleep(20000);
          works = await extractWorks(page);
          if (works && works.length > 0) {
            console.log(`  ✓ Got data after ${attempt} retries`);
            break;
          }
          console.log(`  retry ${attempt}/6...`);
        }
      }

      if (works && works.length > 0) {
        console.log(`  ✅ ${works.length} works — ${works[0].title}`);
        fs.writeFileSync(`${DATA_DIR}/stash${stash.id}.json`, JSON.stringify(works, null, 2));
        results.push({ stash: stash.id, status: 'ok', count: works.length });
      } else {
        console.log(`  ❌ Still empty`);
        results.push({ stash: stash.id, status: 'blocked' });
      }
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      results.push({ stash: stash.id, status: 'error' });
    }
    await page.close();
    await sleep(1500);
  }

  await browser.disconnect();
  console.log('\n========== SUMMARY ==========');
  const ok = results.filter(r => r.status === 'ok');
  const fail = results.filter(r => r.status !== 'ok');
  console.log(`✅ OK: ${ok.length} — ${ok.map(r => `#${r.stash}(${r.count})`).join(', ')}`);
  if (fail.length) console.log(`❌ FAIL: ${fail.length} — ${fail.map(r => `#${r.stash}`).join(', ')}`);
  console.log(`Total works: ${ok.reduce((s, r) => s + r.count, 0)}`);
}

main().catch(console.error);
