import { chromium } from 'playwright';

const URLS = [
  { stashId: '159', url: 'https://www.xinpianchang.com/bookmark/2100212' },
  { stashId: '158', url: 'https://www.xinpianchang.com/bookmark/2100216' },
  { stashId: '157', url: 'https://www.xinpianchang.com/bookmark/2100350' },
  { stashId: '156', url: 'https://www.xinpianchang.com/bookmark/2100442' },
  { stashId: '155', url: 'https://www.xinpianchang.com/bookmark/2100627' },
  { stashId: '154', url: 'https://www.xinpianchang.com/bookmark/2100784' },
  { stashId: '153', url: 'https://www.xinpianchang.com/bookmark/2100975' },
  { stashId: '152', url: 'https://www.xinpianchang.com/bookmark/2101002' },
  { stashId: '151', url: 'https://www.xinpianchang.com/bookmark/2101064' },
  { stashId: '150', url: 'https://www.xinpianchang.com/bookmark/2101287' },
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
    console.error(`Fetching stash ${stashId}: ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for JS to render
    await page.waitForTimeout(6000);
    
    const content = await page.content();
    
    // Strategy 1: __NEXT_DATA__
    let match = content.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    
    if (match) {
      const nd = JSON.parse(match[1]);
      const data = nd?.props?.pageProps?.data || nd?.props?.pageProps?.detail || {};
      
      let works = [];
      if (Array.isArray(data)) {
        works = data;
      } else if (data.videoList || data.list) {
        works = data.videoList || data.list || [];
      }
      
      if (works.length > 0) {
        const formatted = works.map(w => ({
          id: String(w.videoId || w.id || ''),
          title: w.title || '',
          cover: w.cover || w.video_cover || '',
          web_url: `https://www.xinpianchang.com/a${w.videoId || w.id}`,
          duration: w.duration || 0,
          categories: w.category_name || w.categories || '',
          count_view: w.count_view || 0,
          count_like: w.count_like || 0,
          count_collect: w.count_collect || 0,
          author: w.user_name || w.author || '',
        }));
        
        const fs = await import('fs');
        const outPath = new URL(`../src/data/stash${stashId}.json`, import.meta.url);
        fs.writeFileSync(outPath, JSON.stringify(formatted, null, 2), 'utf-8');
        console.error(`  ✅ Saved ${formatted.length} works to stash${stashId}.json`);
        await context.close();
        continue;
      }
    }
    
    // Strategy 2: Try __INITIAL_STATE__
    const jsonMatch = content.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/s);
    if (jsonMatch) {
      console.error(`  Found __INITIAL_STATE__`);
    }
    
    // Strategy 3: Parse page DOM for video cards
    const cards = await page.evaluate(() => {
      const items = [];
      // Try various selectors
      document.querySelectorAll('[class*="video-card"], [class*="work-card"], [class*="card-item"], .bookmark-item, .video-list-item, a[href*="/a"]').forEach(el => {
        const link = el.querySelector('a[href*="/a"]') || el;
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/a(\d+)/);
        if (match) {
          const img = el.querySelector('img');
          const titleEl = el.querySelector('[class*="title"], h3, h4, .name');
          items.push({
            videoId: match[1],
            title: titleEl?.textContent?.trim() || '',
            cover: img?.getAttribute('src') || img?.getAttribute('data-src') || '',
          });
        }
      });
      return items;
    });
    
    if (cards.length > 0) {
      const fs = await import('fs');
      const outPath = new URL(`../src/data/stash${stashId}.json`, import.meta.url);
      fs.writeFileSync(outPath, JSON.stringify(cards.map(c => ({
        id: c.videoId,
        title: c.title,
        cover: c.cover,
        web_url: `https://www.xinpianchang.com/a${c.videoId}`,
        duration: 0,
        categories: '',
        count_view: 0,
        count_like: 0,
        count_collect: 0,
        author: '',
      })), null, 2), 'utf-8');
      console.error(`  ✅ DOM: Saved ${cards.length} works to stash${stashId}.json`);
    } else {
      console.error(`  ❌ No data found for stash ${stashId}`);
      // Save page content for debugging
      const fs = await import('fs');
      const debugPath = new URL(`../src/data/stash${stashId}-debug.html`, import.meta.url);
      fs.writeFileSync(debugPath, content.substring(0, 50000), 'utf-8');
      console.error(`  Saved debug HTML to stash${stashId}-debug.html`);
    }
    
  } catch(e) {
    console.error(`  ❌ ERROR: ${e.message}`);
  }
  
  await context.close();
}

await browser.close();
console.error('Done!');
