/**
 * 快速刷新新片场收藏夹数据
 * 使用本地 Chrome CDP (port 9222)
 * 运行: node scripts/refresh-stash.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// 所有收藏夹URL
const BOOKMARKS = [
  { stashId: '176', url: 'https://www.xinpianchang.com/bookmark/2101797', output: 'stash-works.json' },
  { stashId: '175', url: 'https://www.xinpianchang.com/bookmark/2098799', output: 'stash175.json' },
  { stashId: '174', url: 'https://www.xinpianchang.com/bookmark/2099096', output: 'stash174.json' },
  { stashId: '173', url: 'https://www.xinpianchang.com/bookmark/2099232', output: 'stash173.json' },
  { stashId: '172', url: 'https://www.xinpianchang.com/bookmark/2099244', output: 'stash172.json' },
  { stashId: '171', url: 'https://www.xinpianchang.com/bookmark/2099198', output: 'stash171.json' },
  { stashId: '170', url: 'https://www.xinpianchang.com/bookmark/2099191', output: 'stash170.json' },
  { stashId: '169', url: 'https://www.xinpianchang.com/bookmark/2099178', output: 'stash169.json' },
  { stashId: '168', url: 'https://www.xinpianchang.com/bookmark/2099341', output: 'stash168.json' },
  { stashId: '167', url: 'https://www.xinpianchang.com/bookmark/2099431', output: 'stash167.json' },
  { stashId: '166', url: 'https://www.xinpianchang.com/bookmark/2099457', output: 'stash166.json' },
  { stashId: '165', url: 'https://www.xinpianchang.com/bookmark/2099503', output: 'stash165.json' },
  { stashId: '164', url: 'https://www.xinpianchang.com/bookmark/2099592', output: 'stash164.json' },
  { stashId: '163', url: 'https://www.xinpianchang.com/bookmark/2099730', output: 'stash163.json' },
  { stashId: '162', url: 'https://www.xinpianchang.com/bookmark/2099912', output: 'stash162.json' },
  { stashId: '161', url: 'https://www.xinpianchang.com/bookmark/2100050', output: 'stash161.json' },
  { stashId: '160', url: 'https://www.xinpianchang.com/bookmark/2100140', output: 'stash160.json' },
];

async function fetchBookmark(browser, { stashId, url, output }) {
  const outPath = path.join(DATA_DIR, output);
  
  // Skip if file already has good data - disabled for force refresh
  if (false && existsSync(outPath)) {
    try {
      const existing = JSON.parse(readFileSync(outPath, 'utf-8'));
      const withData = existing.filter(w => w.count_view !== undefined).length;
      if (withData > existing.length * 0.5 && existing.length > 20) {
        console.error(`  ⏭️  ${output} (${existing.length} works, ${withData} with counts) - skip`);
        return null;
      }
    } catch {}
  }

  console.error(`\n📥 stash-${stashId}: ${url}`);
  const page = await browser.newPage();
  
  try {
    // 监听API响应
    let apiData = null;
    page.on('response', async (response) => {
      const rUrl = response.url();
      if (rUrl.includes('/api/') && response.status() === 200) {
        try {
          const json = await response.json();
          if (json?.data?.list || json?.list) {
            apiData = json?.data?.list || json?.list;
            console.error(`  📡 API data found at: ${rUrl.substring(0, 80)}`);
          }
        } catch {}
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Scroll to load
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1000);

    // Try to extract from __NEXT_DATA__
    const nextData = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      return el ? el.textContent : null;
    });

    let works = null;

    if (nextData) {
      try {
        const nd = JSON.parse(nextData);
        const props = nd?.props?.pageProps || {};
        
        // Find the array with web_url fields
        for (const key of Object.keys(props)) {
          const val = props[key];
          if (Array.isArray(val) && val.length > 0 && val[0]?.web_url) {
            works = val;
            console.error(`  ✅ Found in __NEXT_DATA__.${key}: ${works.length} works`);
            break;
          }
        }
      } catch {}
    }

    // Fallback: scrape from DOM
    if (!works) {
      works = await page.evaluate(() => {
        const workMap = new Map();
        const links = document.querySelectorAll('a[href*="/a"]');
        
        for (const link of links) {
          const href = link.getAttribute('href') || '';
          const m = href.match(/\/(a\d+)/);
          if (!m) continue;
          const id = m[1];
          const text = (link.textContent || '').trim();
          if (!text) continue;

          if (!workMap.has(id)) {
            workMap.set(id, { id, title: '', cover: '', web_url: `https://www.xinpianchang.com/${id}`, duration: 0, categories: '', count_view: 0, count_like: 0, count_collect: 0, author: '栖光文化', publish_time: 0 });
          }
          const entry = workMap.get(id);

          if (text.includes('播放')) {
            const v = text.match(/播放[：:]\s*(\d[\d,]*)/);
            if (v) entry.count_view = parseInt(v[1].replace(/,/g, '')) || 0;
            const l = text.match(/人气[：:]\s*(\d[\d,]*)/);
            if (l) entry.count_like = parseInt(l[1].replace(/,/g, '')) || 0;
            const d = text.match(/时长[：:]\s*(\d+):(\d+)/);
            if (d) entry.duration = parseInt(d[1]) * 60 + parseInt(d[2]);
          } else if (!text.includes('播放') && !text.includes('人气') && !text.includes('时') && text.length > 1) {
            if (!entry.title || text.length < 20) entry.title = text;
          }
        }

        // Get cover images
        for (const link of links) {
          const href = link.getAttribute('href') || '';
          const m = href.match(/\/(a\d+)/);
          if (!m) continue;
          const entry = workMap.get(m[1]);
          if (!entry || entry.cover) continue;
          const img = link.querySelector('img');
          if (img) {
            const src = img.src || img.getAttribute('data-src') || '';
            if (src && !src.includes('avatar')) entry.cover = src;
          }
        }

        return [...workMap.values()];
      });
      console.error(`  🔍 DOM scraped: ${works.length} works`);
    }

    if (works && works.length > 0) {
      // Normalize field names
      const normalized = works.map(w => ({
        id: w.id || w.videoId,
        title: w.title || '',
        web_url: w.web_url || `https://www.xinpianchang.com/a${w.id}`,
        cover: w.cover || w.thumbnail || '',
        duration: w.duration || 0,
        categories: w.categories || w.category_name || '',
        publish_time: w.publish_time || 0,
        count_view: w.count_view || w.views || 0,
        count_like: w.count_like || w.likes || 0,
        count_collect: w.count_collect || w.collects || 0,
        author: w.author || '栖光文化',
      }));

      writeFileSync(outPath, JSON.stringify(normalized, null, 2));
      const heat0 = normalized.filter(w => w.count_view > 0).length;
      console.error(`  ✅ Saved ${normalized.length} works to ${output} (${heat0} with view data)`);
      return normalized;
    } else {
      console.error(`  ❌ No works found`);
      return null;
    }
  } catch (e) {
    console.error(`  ❌ Error: ${e.message}`);
    return null;
  } finally {
    await page.close();
  }
}

async function main() {
  console.error('🚀 Connecting to Chrome CDP on port 9222...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  console.error('✅ Connected\n');

  for (const bm of BOOKMARKS) {
    await fetchBookmark(browser, bm);
  }

  await browser.close();
  console.error('\n✅ All done!');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
