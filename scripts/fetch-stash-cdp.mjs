import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

const URLS = [
  { stashId: '167', url: 'https://www.xinpianchang.com/bookmark/2099431' },
  { stashId: '166', url: 'https://www.xinpianchang.com/bookmark/2099457' },
  { stashId: '165', url: 'https://www.xinpianchang.com/bookmark/2099503' },
  { stashId: '164', url: 'https://www.xinpianchang.com/bookmark/2099592' },
  { stashId: '163', url: 'https://www.xinpianchang.com/bookmark/2099730' },
  { stashId: '162', url: 'https://www.xinpianchang.com/bookmark/2099912' },
  { stashId: '161', url: 'https://www.xinpianchang.com/bookmark/2100050' },
  { stashId: '160', url: 'https://www.xinpianchang.com/bookmark/2100140' },
];

// Connect to existing Chrome with CDP
const browser = await chromium.connectOverCDP('http://localhost:9222');

for (const { stashId, url } of URLS) {
  const contexts = browser.contexts();
  const context = contexts[0] || await browser.newContext();
  const page = await context.newPage();

  try {
    console.error(`\nFetching stash ${stashId}: ${url}...`);
    
    // Capture API responses
    let capturedWorks = null;
    page.on('response', async (response) => {
      const rUrl = response.url();
      if (response.status() === 200) {
        try {
          const json = await response.json();
          const findArrays = (obj, depth = 0) => {
            if (depth > 5 || capturedWorks) return;
            if (Array.isArray(obj) && obj.length > 5 && obj[0]?.id && (obj[0]?.title || obj[0]?.web_url || obj[0]?.count_view !== undefined)) {
              capturedWorks = obj;
              console.error(`  API captured ${obj.length} works from ${rUrl.substring(0, 80)}...`);
            } else if (typeof obj === 'object' && !Array.isArray(obj) && obj !== null) {
              for (const v of Object.values(obj)) findArrays(v, depth + 1);
            }
          };
          findArrays(json);
        } catch {}
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(5000);
    
    // Scroll multiple times to load all content
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(1000);
    }

    let works = null;

    // Method 1: __NEXT_DATA__
    const nextDataText = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      return el ? el.textContent : null;
    });

    if (nextDataText) {
      try {
        const nd = JSON.parse(nextDataText);
        const props = nd?.props?.pageProps || {};
        
        // Search recursively
        const findArrays = (obj, path = '', depth = 0) => {
          if (depth > 8 || works) return;
          if (Array.isArray(obj) && obj.length > 0 && obj[0]?.id && (obj[0]?.title || obj[0]?.web_url || obj[0]?.count_view !== undefined)) {
            works = obj;
            console.error(`  __NEXT_DATA__ found at ${path}: ${works.length} items`);
            return;
          }
          if (typeof obj === 'object' && !Array.isArray(obj) && obj !== null) {
            for (const [k, v] of Object.entries(obj)) findArrays(v, `${path}.${k}`, depth + 1);
          }
        };
        findArrays(props, 'props');
        
        if (!works) {
          // Check detail specifically
          const detail = props.detail;
          if (detail) {
            console.error(`  detail type: ${typeof detail}, keys: ${typeof detail === 'object' ? Object.keys(detail).join(',') : 'N/A'}`);
            writeFileSync(`/tmp/stash${stashId}-detail.json`, JSON.stringify(detail, null, 2));
          }
          writeFileSync(`/tmp/stash${stashId}-props.json`, JSON.stringify(props, null, 2));
        }
      } catch (e) {
        console.error(`  __NEXT_DATA__ parse error: ${e.message}`);
      }
    }

    // Method 2: API captured data
    if (!works && capturedWorks) {
      works = capturedWorks;
      console.error(`  Using API captured data: ${works.length} works`);
    }

    // Method 3: DOM extraction with better selectors
    if (!works) {
      console.error(`  Trying enhanced DOM extraction...`);
      works = await page.evaluate(() => {
        // Find all links to videos
        const allLinks = document.querySelectorAll('a');
        const workMap = new Map();
        
        allLinks.forEach(a => {
          const href = a.getAttribute('href') || '';
          const m = href.match(/\/a(\d+)/);
          if (!m) return;
          const id = parseInt(m[1]);
          if (workMap.has(id)) return;
          
          // Try to find title, cover, category in nearby elements
          const card = a.closest('[class*="card"]') || a.closest('[class*="item"]') || a.closest('[class*="work"]') || a.parentElement?.parentElement;
          
          const title = card?.querySelector('[class*="title"], [class*="name"], h3, h4, p')?.textContent?.trim() || a.textContent?.trim() || '';
          const coverImg = card?.querySelector('img');
          const cover = coverImg?.src || coverImg?.getAttribute('data-src') || '';
          const catEl = card?.querySelector('[class*="cat"], [class*="tag"], [class*="type"]');
          const categories = catEl?.textContent?.trim() || '';
          
          // Parse duration
          const durEl = card?.querySelector('[class*="dur"], [class*="time"]');
          const durText = durEl?.textContent?.trim() || '';
          let duration = 0;
          const dm = durText.match(/(\d+):(\d+)/);
          if (dm) duration = parseInt(dm[1]) * 60 + parseInt(dm[2]);
          
          // Parse views
          const viewEl = card?.querySelector('[class*="view"], [class*="play"], [class*="count"]');
          const viewText = viewEl?.textContent?.trim() || '';
          let views = 0;
          const vm = viewText.match(/[\d,]+/);
          if (vm) views = parseInt(vm[0].replace(/,/g, '')) || 0;
          
          workMap.set(id, {
            id, title: title.substring(0, 200), cover, 
            web_url: `https://www.xinpianchang.com/a${id}`,
            duration, categories, count_view: views,
            count_like: 0, count_collect: 0,
            author: '栖光文化', publish_time: 0,
          });
        });
        
        return [...workMap.values()];
      });
      console.error(`  DOM extraction: ${works?.length || 0} works`);
    }

    if (works && works.length > 0) {
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

  await page.close();
}

console.error('\n✅ Done!');
