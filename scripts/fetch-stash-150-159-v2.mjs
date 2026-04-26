import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

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

const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });

for (const { stashId, url } of URLS) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  await context.addInitScript(() => {
    // Remove webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    // Add chrome object
    window.chrome = { runtime: {} };
    // Override permissions
    const originalQuery = window.navigator.permissions?.query;
    if (originalQuery) {
      window.navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);
    }
  });

  const page = await context.newPage();

  // Capture API responses
  let capturedWorks = null;
  page.on('response', async (resp) => {
    try {
      const rUrl = resp.url();
      if (rUrl.includes('/api/') && resp.status() === 200) {
        const ct = resp.headers()['content-type'] || '';
        if (ct.includes('json')) {
          const json = await resp.json();
          // Look for arrays with video data
          const data = json?.data;
          if (data) {
            let list = null;
            if (Array.isArray(data)) list = data;
            else if (data.list && Array.isArray(data.list)) list = data.list;
            else if (data.videoList && Array.isArray(data.videoList)) list = data.videoList;
            
            if (list && list.length > 0) {
              const first = list[0];
              if (first.id || first.videoId || first.title || first.cover) {
                capturedWorks = list;
                console.error(`  [API] ${list.length} works from: ${rUrl.split('?')[0]}`);
              }
            }
          }
        }
      }
    } catch {}
  });

  try {
    console.error(`\n📊 Fetching stash ${stashId}: ${url}`);
    
    // Visit homepage first
    await page.goto('https://www.xinpianchang.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    
    // Navigate to bookmark
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Check for security check page
    const pageTitle = await page.title();
    if (pageTitle.includes('安全')) {
      console.error(`  ⏳ Security check - waiting 90s for manual solve...`);
      await page.waitForFunction(
        () => !document.title.includes('安全') && !document.body?.innerText?.includes('安全检测'),
        { timeout: 90000 }
      ).catch(() => {});
      await page.waitForTimeout(5000);
      // Reload after security check
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(8000);
    }

    // Check if page actually loaded content
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 200));
    console.error(`  Page text: "${bodyText?.substring(0, 100)}..."`);

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
        console.error(`  __NEXT_DATA__ pageProps keys: [${keys.join(', ')}]`);
        
        for (const key of keys) {
          const val = props[key];
          if (Array.isArray(val) && val.length > 0 && val[0]?.id) {
            works = val;
            console.error(`  ✅ Found in props.${key}: ${val.length} items`);
            break;
          }
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            for (const k2 of Object.keys(val)) {
              const v2 = val[k2];
              if (Array.isArray(v2) && v2.length > 0 && v2[0]?.id) {
                works = v2;
                console.error(`  ✅ Found in props.${key}.${k2}: ${v2.length} items`);
                break;
              }
            }
            if (works) break;
          }
        }
        
        if (!works && keys.length > 0) {
          // Dump full props for debugging
          writeFileSync(`/tmp/stash${stashId}-nextdata.json`, JSON.stringify(nd, null, 2));
          console.error(`  Dumped __NEXT_DATA__ to /tmp/stash${stashId}-nextdata.json`);
        }
      } catch (e) {
        console.error(`  __NEXT_DATA__ parse error: ${e.message}`);
      }
    }

    // Method 2: Use captured API data
    if (!works && capturedWorks) {
      works = capturedWorks;
      console.error(`  ✅ Using API data: ${works.length} works`);
    }

    // Method 3: DOM extraction
    if (!works) {
      console.error(`  Trying DOM extraction...`);
      works = await page.evaluate(() => {
        const results = [];
        // Try multiple selectors
        const selectors = [
          'a[href*="/a"]',
          '[class*="video"] a[href*="/a"]',
          '[class*="work"] a[href*="/a"]',
          '[class*="card"] a[href*="/a"]',
          '.work-card',
          '.video-card',
        ];
        
        const seen = new Set();
        for (const sel of selectors) {
          const items = document.querySelectorAll(sel);
          items.forEach(item => {
            const href = item.getAttribute('href') || '';
            const idMatch = href.match(/\/a(\d+)/);
            if (!idMatch || seen.has(idMatch[1])) return;
            seen.add(idMatch[1]);
            
            const img = item.querySelector('img');
            const titleEl = item.querySelector('[class*="title"], h3, h4, [class*="name"]');
            const catEl = item.querySelector('[class*="categ"], [class*="tag"]');
            
            results.push({
              id: parseInt(idMatch[1]),
              title: titleEl?.textContent?.trim() || '',
              cover: img?.src || img?.getAttribute('data-src') || img?.getAttribute('data-original') || '',
              web_url: `https://www.xinpianchang.com/a${idMatch[1]}`,
              duration: 0,
              categories: catEl?.textContent?.trim() || '',
              count_view: 0,
              count_like: 0,
              count_collect: 0,
              author: '',
            });
          });
          if (results.length > 0) break;
        }
        return results;
      });
      console.error(`  DOM: ${works?.length || 0} works`);
    }

    if (works && works.length > 0) {
      // Validate
      const validWorks = works.filter(w => w.id && w.title && w.cover);
      console.error(`  Valid works (id+title+cover): ${validWorks.length}/${works.length}`);
      
      if (validWorks.length > 0) {
        const normalized = validWorks.map(w => ({
          id: w.id || w.videoId,
          title: w.title || '',
          cover: w.cover || w.video_cover || '',
          web_url: w.web_url || `https://www.xinpianchang.com/a${w.id || w.videoId}`,
          duration: w.duration || 0,
          categories: w.categories || w.category_name || '',
          count_view: w.count_view || w.views || 0,
          count_like: w.count_like || w.likes || 0,
          count_collect: w.count_collect || w.collects || 0,
          author: w.author || w.user_name || '',
        }));

        const outPath = `src/data/stash${stashId}.json`;
        writeFileSync(outPath, JSON.stringify(normalized, null, 2));
        console.error(`  ✅ SAVED ${normalized.length} works to ${outPath}`);
      } else {
        console.error(`  ❌ All works missing required fields (id/title/cover)`);
      }
    } else {
      console.error(`  ❌ No works found`);
    }
  } catch (e) {
    console.error(`  ❌ ERROR: ${e.message}`);
  }

  await context.close();
}

await browser.close();
console.error('\n✅ All done!');
