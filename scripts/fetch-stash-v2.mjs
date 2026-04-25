import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

const URLS = [
  { stashId: '169', url: 'https://www.xinpianchang.com/bookmark/2099178' },
  { stashId: '168', url: 'https://www.xinpianchang.com/bookmark/2099341' },
  { stashId: '167', url: 'https://www.xinpianchang.com/bookmark/2099431' },
  { stashId: '166', url: 'https://www.xinpianchang.com/bookmark/2099457' },
  { stashId: '165', url: 'https://www.xinpianchang.com/bookmark/2099503' },
  { stashId: '164', url: 'https://www.xinpianchang.com/bookmark/2099592' },
  { stashId: '163', url: 'https://www.xinpianchang.com/bookmark/2099730' },
  { stashId: '162', url: 'https://www.xinpianchang.com/bookmark/2099912' },
  { stashId: '161', url: 'https://www.xinpianchang.com/bookmark/2100050' },
  { stashId: '160', url: 'https://www.xinpianchang.com/bookmark/2100140' },
];

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
});

for (const { stashId, url } of URLS) {
  // Skip if already has good data (168, 169 already exist with full data)
  if (stashId === '168' || stashId === '169') {
    try {
      const d = JSON.parse(readFileSync(`src/data/stash-${stashId}.json`, 'utf-8'));
      if (d.length > 0 && d[0].title && d[0].duration > 0) {
        console.error(`stash-${stashId} already has good data (${d.length} works), skipping`);
        continue;
      }
    } catch {}
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    console.error(`\nFetching stash ${stashId}: ${url}...`);
    
    // Intercept network responses for API data
    let capturedWorks = [];
    page.on('response', async (response) => {
      const rUrl = response.url();
      // Capture any response that looks like it contains work/video data
      if (response.status() === 200 && (rUrl.includes('bookmark') || rUrl.includes('video') || rUrl.includes('works'))) {
        try {
          const json = await response.json();
          // Search for arrays with work-like objects
          const searchArrays = (obj, depth = 0) => {
            if (depth > 5 || !obj) return;
            if (Array.isArray(obj) && obj.length > 0 && obj[0]?.id && (obj[0]?.title || obj[0]?.videoName)) {
              capturedWorks = obj;
            } else if (typeof obj === 'object' && !Array.isArray(obj)) {
              for (const v of Object.values(obj)) {
                searchArrays(v, depth + 1);
              }
            }
          };
          searchArrays(json);
        } catch {}
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    
    // Wait for page to fully render
    await page.waitForTimeout(4000);
    
    // Scroll down to trigger lazy loading
    await page.evaluate(async () => {
      const delay = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 20; i++) {
        window.scrollBy(0, 800);
        await delay(500);
      }
    });
    await page.waitForTimeout(3000);

    // Method 1: Extract __NEXT_DATA__ and check `detail` field
    let works = null;
    const nextDataText = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      return el ? el.textContent : null;
    });

    if (nextDataText) {
      try {
        const nd = JSON.parse(nextDataText);
        const props = nd?.props?.pageProps || {};
        
        // Check detail field - it might contain the bookmark info with work IDs
        if (props.detail) {
          const detail = props.detail;
          console.error(`  detail keys: ${Object.keys(detail).join(', ')}`);
          
          // Check if detail has a list of works
          if (detail.works || detail.videos || detail.list || detail.videoList) {
            const list = detail.works || detail.videos || detail.list || detail.videoList;
            if (Array.isArray(list) && list.length > 0) {
              works = list;
              console.error(`  Found works in detail: ${works.length} items`);
            }
          }
          
          // Check detail for workIds that need separate fetching
          if (!works && (detail.workIds || detail.videoIds)) {
            console.error(`  detail has workIds/videoIds but needs separate fetch`);
          }
          
          // Check if detail itself is an array
          if (!works && Array.isArray(detail)) {
            works = detail;
            console.error(`  detail is array: ${works.length} items`);
          }
        }
        
        // Search all props recursively for work arrays
        if (!works) {
          const findArrays = (obj, path = '', depth = 0) => {
            if (depth > 6 || works) return;
            if (Array.isArray(obj) && obj.length > 0 && obj[0]?.id && (obj[0]?.title || obj[0]?.web_url || obj[0]?.videoName)) {
              works = obj;
              console.error(`  Found works at ${path}: ${works.length} items`);
              return;
            }
            if (typeof obj === 'object' && !Array.isArray(obj) && obj !== null) {
              for (const [k, v] of Object.entries(obj)) {
                findArrays(v, `${path}.${k}`, depth + 1);
              }
            }
          };
          findArrays(props, 'props');
        }
        
        if (!works) {
          console.error(`  No works in __NEXT_DATA__. Detail type: ${typeof props.detail}, detail sample: ${JSON.stringify(props.detail)?.substring(0, 300)}`);
          // Save full NEXT_DATA for inspection
          writeFileSync(`/tmp/stash${stashId}-nextdata.json`, JSON.stringify(nd, null, 2));
        }
      } catch (e) {
        console.error(`  __NEXT_DATA__ parse error: ${e.message}`);
      }
    }

    // Method 2: Use intercepted API data
    if (!works && capturedWorks.length > 0) {
      works = capturedWorks;
      console.error(`  Using intercepted API data: ${works.length} works`);
    }

    // Method 3: Extract work IDs from DOM, then try to get full data from NEXT_DATA detail
    if (!works) {
      const domIds = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/a"]');
        const ids = new Set();
        links.forEach(a => {
          const m = a.getAttribute('href')?.match(/\/a(\d+)/);
          if (m) ids.add(parseInt(m[1]));
        });
        return [...ids];
      });
      console.error(`  Found ${domIds.length} work IDs from DOM`);
      
      if (domIds.length > 0) {
        // Try to get detail data from NEXT_DATA for each video
        works = domIds.map(id => ({
          id,
          title: '',
          cover: '',
          web_url: `https://www.xinpianchang.com/a${id}`,
          duration: 0,
          categories: '',
          count_view: 0,
          count_like: 0,
          count_collect: 0,
          author: '栖光文化',
          publish_time: 0,
        }));
        console.error(`  Created ${works.length} stub entries from DOM IDs`);
      }
    }

    if (works && works.length > 0) {
      // Normalize format to match existing data
      const normalized = works.map(w => ({
        id: w.id || w.videoId,
        title: w.title || w.videoName || w.name || '',
        cover: w.cover || w.video_cover || w.thumbnail || w.pic || '',
        web_url: w.web_url || `https://www.xinpianchang.com/a${w.id || w.videoId}`,
        duration: w.duration || w.videoDuration || 0,
        categories: w.categories || w.category_name || w.categoryName || w.category || '',
        count_view: w.count_view || w.views || w.playCount || w.view_count || 0,
        count_like: w.count_like || w.likes || w.likeCount || w.like_count || 0,
        count_collect: w.count_collect || w.collects || w.collectCount || w.collect_count || 0,
        author: w.author || w.user_name || w.userName || w.creator || '栖光文化',
        publish_time: w.publish_time || w.publishTime || w.created_at || 0,
      }));

      const outPath = `src/data/stash${stashId}.json`;
      writeFileSync(outPath, JSON.stringify(normalized, null, 2));
      console.error(`  ✅ Saved ${normalized.length} works to ${outPath}`);
      
      // Quality check
      const withTitle = normalized.filter(w => w.title).length;
      const withCover = normalized.filter(w => w.cover).length;
      const withDuration = normalized.filter(w => w.duration > 0).length;
      console.error(`  Quality: title=${withTitle}/${normalized.length} cover=${withCover}/${normalized.length} duration=${withDuration}/${normalized.length}`);
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
