import { writeFileSync } from 'fs';

// Connect to existing Chrome via CDP - this bypasses bot detection since it's a real browser
const CDP = await import('playwright-core').then(m => m.chromium);
const browser = await CDP.connectOverCDP('http://localhost:9222');

const context = browser.contexts()[0] || await browser.newContext();
const page = await context.newPage();

const URLS = [
  { stashId: '159', url: 'https://www.xinpianchang.com/bookmark/2100738' },
  { stashId: '158', url: 'https://www.xinpianchang.com/bookmark/2100781' },
  { stashId: '157', url: 'https://www.xinpianchang.com/bookmark/2100829' },
  { stashId: '156', url: 'https://www.xinpianchang.com/bookmark/2100863' },
  { stashId: '155', url: 'https://www.xinpianchang.com/bookmark/2100883' },
  { stashId: '154', url: 'https://www.xinpianchang.com/bookmark/2100918' },
  { stashId: '153', url: 'https://www.xinpianchang.com/bookmark/2100975' },
  { stashId: '152', url: 'https://www.xinpianchang.com/bookmark/2101002' },
  { stashId: '151', url: 'https://www.xinpianchang.com/bookmark/2101064' },
  { stashId: '150', url: 'https://www.xinpianchang.com/bookmark/2101287' },
];

for (const { stashId, url } of URLS) {
  try {
    console.error(`\n📊 Fetching stash ${stashId}: ${url}`);
    
    // Capture API responses for video data
    let capturedWorks = null;
    const responseHandler = async (resp) => {
      try {
        const rUrl = resp.url();
        if ((rUrl.includes('/bookmark/') || rUrl.includes('/collection/') || rUrl.includes('/fav')) && resp.status() === 200) {
          const ct = resp.headers()['content-type'] || '';
          if (ct.includes('json') || ct.includes('html')) {
            const text = await resp.text();
            if (text.includes('"videoList"') || text.includes('"video_id"') || text.includes('"cover"')) {
              console.error(`  [BOOKMARK API] ${rUrl} (${text.length} bytes)`);
              writeFileSync(`/tmp/stash${stashId}-raw.json`, text);
            }
          }
        }
        // Also check for API responses
        if (rUrl.includes('/api/') && resp.status() === 200) {
          const ct = resp.headers()['content-type'] || '';
          if (ct.includes('json')) {
            try {
              const json = await resp.json();
              const data = json?.data;
              if (data) {
                let list = Array.isArray(data) ? data : (data.list || data.videoList || null);
                if (list && Array.isArray(list) && list.length > 0 && list[0]?.id) {
                  capturedWorks = list;
                  console.error(`  [API] ${list.length} works from ${rUrl.split('?')[0].split('/').pop()}`);
                }
              }
            } catch {}
          }
        }
      } catch {}
    };
    page.on('response', responseHandler);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Check if security check
    const pageTitle = await page.title();
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 100));
    console.error(`  Title: "${pageTitle}", Body: "${bodyText}"`);

    if (pageTitle.includes('安全') || bodyText?.includes('安全检测')) {
      console.error(`  ⏳ Security check detected - waiting...`);
      await page.waitForFunction(
        () => !document.title.includes('安全') && !document.body?.innerText?.includes('安全检测'),
        { timeout: 120000 }
      ).catch(() => console.error(`  ⚠️ Still on security check after 120s`));
      await page.waitForTimeout(3000);
    }

    // Scroll to load more
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }

    // Try __NEXT_DATA__
    let works = null;
    const nextDataText = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      return el ? el.textContent : null;
    });

    if (nextDataText) {
      try {
        const nd = JSON.parse(nextDataText);
        const props = nd?.props?.pageProps || {};
        const keys = Object.keys(props);
        console.error(`  pageProps keys: [${keys.join(', ')}]`);
        
        // Deep search for video arrays
        const search = (obj, depth = 0) => {
          if (depth > 4 || !obj || typeof obj !== 'object') return null;
          if (Array.isArray(obj) && obj.length > 0 && obj[0]?.id && (obj[0]?.title || obj[0]?.cover)) {
            return obj;
          }
          for (const k of Object.keys(obj)) {
            const result = search(obj[k], depth + 1);
            if (result) return result;
          }
          return null;
        };
        
        works = search(props);
        if (works) console.error(`  ✅ Found ${works.length} works in __NEXT_DATA__`);
        else console.error(`  ❌ No video array in __NEXT_DATA__`);
      } catch (e) {
        console.error(`  Parse error: ${e.message}`);
      }
    }

    // Method 2: API intercepted
    if (!works && capturedWorks) {
      works = capturedWorks;
      console.error(`  ✅ Using API data: ${works.length} works`);
    }

    // Method 3: DOM extraction
    if (!works) {
      console.error(`  Trying DOM...`);
      works = await page.evaluate(() => {
        const seen = new Set();
        const results = [];
        const allLinks = document.querySelectorAll('a[href*="/a"]');
        allLinks.forEach(item => {
          const href = item.getAttribute('href') || '';
          const m = href.match(/\/a(\d+)/);
          if (!m || seen.has(m[1])) return;
          seen.add(m[1]);
          
          // Walk up to find card container
          let container = item.closest('[class*="card"]') || item.closest('[class*="item"]') || item.closest('[class*="video"]') || item;
          const img = container.querySelector('img');
          const titleEl = container.querySelector('[class*="title"]');
          
          results.push({
            id: parseInt(m[1]),
            title: titleEl?.textContent?.trim() || item.getAttribute('title') || '',
            cover: img?.src || img?.getAttribute('data-src') || img?.getAttribute('data-original') || '',
            web_url: `https://www.xinpianchang.com/a${m[1]}`,
            duration: 0, categories: '', count_view: 0, count_like: 0, count_collect: 0, author: '',
          });
        });
        return results;
      });
      if (works && works.length > 0) {
        const valid = works.filter(w => w.cover && w.cover.startsWith('http'));
        console.error(`  DOM: ${valid.length} valid (with cover) out of ${works.length}`);
        works = valid;
      } else {
        console.error(`  DOM: 0 works`);
      }
    }

    if (works && works.length > 0) {
      const normalized = works.map(w => ({
        id: w.id || w.videoId,
        title: w.title || '',
        cover: w.cover || w.video_cover || '',
        web_url: w.web_url || `https://www.xinpianchang.com/a${w.id || w.videoId}`,
        duration: w.duration || 0,
        categories: w.categories || w.category_name || '',
        count_view: w.count_view || w.views || w.playCount || 0,
        count_like: w.count_like || w.likes || 0,
        count_collect: w.count_collect || w.collects || 0,
        author: w.author || w.user_name || '',
      }));

      writeFileSync(`src/data/stash${stashId}.json`, JSON.stringify(normalized, null, 2));
      console.error(`  ✅ SAVED ${normalized.length} works to stash${stashId}.json`);
    } else {
      console.error(`  ❌ No works found`);
    }
    
    page.off('response', responseHandler);
  } catch (e) {
    console.error(`  ❌ ERROR: ${e.message}`);
  }
}

await page.close();
console.error('\n✅ All done!');
