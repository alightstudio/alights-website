import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URLS = [
  { stashId: '144', url: 'https://www.xinpianchang.com/bookmark/2107284' },
  { stashId: '143', url: 'https://www.xinpianchang.com/bookmark/2108851' },
  { stashId: '142', url: 'https://www.xinpianchang.com/bookmark/2109752' },
  { stashId: '141', url: 'https://www.xinpianchang.com/bookmark/2110619' },
  { stashId: '140', url: 'https://www.xinpianchang.com/bookmark/2111558' },
];

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
});

for (const { stashId, url } of URLS) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    console.error(`\nFetching stash ${stashId}: ${url}...`);
    
    let apiData = null;
    page.on('response', async (response) => {
      const rUrl = response.url();
      if (rUrl.includes('/api/') && response.status() === 200) {
        try {
          const json = await response.json();
          if (json && (json.data?.list || json.data?.videoList || Array.isArray(json.data))) {
            const list = json.data?.list || json.data?.videoList || (Array.isArray(json.data) ? json.data : null);
            if (list && list.length > 0 && list[0]?.id && list[0]?.title) {
              apiData = list;
              console.error(`  API captured: ${list.length} works`);
            }
          }
        } catch {}
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(6000);

    let works = null;

    // Method 1: Try __NEXT_DATA__
    const nextDataText = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      return el ? el.textContent : null;
    });

    if (nextDataText) {
      try {
        const nd = JSON.parse(nextDataText);
        const props = nd?.props?.pageProps || {};
        for (const key of Object.keys(props)) {
          const val = props[key];
          if (Array.isArray(val) && val.length > 0 && val[0]?.id && val[0]?.title) {
            works = val;
            console.error(`  __NEXT_DATA__ found works in props.${key}: ${val.length} items`);
            break;
          }
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            for (const k2 of Object.keys(val)) {
              const v2 = val[k2];
              if (Array.isArray(v2) && v2.length > 0 && v2[0]?.id && v2[0]?.title) {
                works = v2;
                console.error(`  __NEXT_DATA__ found in props.${key}.${k2}: ${v2.length} items`);
                break;
              }
            }
            if (works) break;
          }
        }
      } catch (e) {
        console.error(`  __NEXT_DATA__ parse error: ${e.message}`);
      }
    }

    // Method 2: API intercepted
    if (!works && apiData) {
      works = apiData;
      console.error(`  Using API intercepted data: ${works.length} works`);
    }

    // Method 3: DOM
    if (!works) {
      works = await page.evaluate(() => {
        const items = document.querySelectorAll('[class*="video-item"], [class*="work-item"], [class*="card-item"], .work-card, .video-card, a[href*="/a"]');
        const results = [];
        items.forEach(item => {
          const link = item.querySelector('a[href*="/a"]') || item.closest('a[href*="/a"]') || item;
          const href = link.getAttribute('href') || '';
          const idMatch = href.match(/\/a(\d+)/);
          if (!idMatch) return;
          
          const titleEl = item.querySelector('[class*="title"], h3, h4, .title');
          const coverEl = item.querySelector('img');
          const catEl = item.querySelector('[class*="categ"], [class*="tag"], .tag');
          
          results.push({
            id: parseInt(idMatch[1]),
            title: titleEl?.textContent?.trim() || '',
            cover: coverEl?.src || coverEl?.getAttribute('data-src') || '',
            web_url: `https://www.xinpianchang.com/a${idMatch[1]}`,
            duration: 0,
            categories: catEl?.textContent?.trim() || '',
            count_view: 0,
            count_like: 0,
            count_collect: 0,
            author: '栖光文化',
          });
        });
        return results;
      });
      console.error(`  DOM extraction: ${works?.length || 0} works`);
    }

    if (works && works.length > 0) {
      const normalized = works.map(w => ({
        id: w.id || w.videoId,
        title: w.title || w.videoName || '',
        cover: w.cover || w.video_cover || w.thumbnail || '',
        web_url: w.web_url || `https://www.xinpianchang.com/a${w.id || w.videoId}`,
        duration: w.duration || 0,
        categories: w.categories || w.category_name || w.categoryName || '',
        count_view: w.count_view || w.views || w.playCount || 0,
        count_like: w.count_like || w.likes || w.likeCount || 0,
        count_collect: w.count_collect || w.collects || w.collectCount || 0,
        author: w.author || w.user_name || w.userName || '栖光文化',
        publish_time: w.publish_time || w.publishTime || 0,
      }));

      const outPath = `src/data/stash${stashId}.json`;
      writeFileSync(outPath, JSON.stringify(normalized, null, 2));
      console.error(`  ✅ Saved ${normalized.length} works to ${outPath}`);
    } else {
      console.error(`  ❌ No works found for stash ${stashId}`);
    }
  } catch (e) {
    console.error(`  ERROR: ${e.message}`);
  }

  await context.close();
}

await browser.close();
console.error('\n✅ Done!');