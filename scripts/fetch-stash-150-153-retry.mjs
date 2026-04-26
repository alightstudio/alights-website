import { chromium } from 'playwright';

const URLS = [
  { stashId: '153', url: 'https://www.xinpianchang.com/bookmark/2100975' },
  { stashId: '152', url: 'https://www.xinpianchang.com/bookmark/2101002' },
  { stashId: '151', url: 'https://www.xinpianchang.com/bookmark/2101064' },
  { stashId: '150', url: 'https://www.xinpianchang.com/bookmark/2101287' },
];

const browser = await chromium.launch({ 
  headless: false,  // Use headed mode to bypass bot detection
  args: [
    '--no-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
  ],
});

for (const { stashId, url } of URLS) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    viewport: { width: 1920, height: 1080 },
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });
  
  // Remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // Override plugins to look more real
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
  });
  
  const page = await context.newPage();

  try {
    console.error(`Fetching stash ${stashId}: ${url}...`);
    
    // First visit the homepage to set cookies
    await page.goto('https://www.xinpianchang.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    
    // Then navigate to the bookmark page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Check if we hit the security check page
    const title = await page.title();
    if (title.includes('安全检测')) {
      console.error(`  ⏳ Security check detected, waiting for manual solve...`);
      // Wait up to 60 seconds for user to pass security check
      await page.waitForFunction(
        () => !document.title.includes('安全检测'),
        { timeout: 60000 }
      ).catch(() => {});
      await page.waitForTimeout(5000);
    }
    
    // Wait for content to load
    await page.waitForTimeout(5000);
    
    const content = await page.content();
    
    // Check for __NEXT_DATA__
    const match = content.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    
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
      } else {
        console.error(`  ❌ __NEXT_DATA__ found but no videoList. Keys:`, Object.keys(data));
      }
    } else {
      const pageTitle = await page.title();
      console.error(`  ❌ No __NEXT_DATA__. Page title: "${pageTitle}"`);
    }
    
    // DOM fallback
    const cards = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('a[href*="/a"]').forEach(el => {
        const href = el.getAttribute('href') || '';
        const m = href.match(/\/a(\d+)/);
        if (m) {
          const img = el.querySelector('img');
          const titleEl = el.querySelector('[class*="title"], h3, h4');
          items.push({
            videoId: m[1],
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
        id: c.videoId, title: c.title, cover: c.cover,
        web_url: `https://www.xinpianchang.com/a${c.videoId}`,
        duration: 0, categories: '', count_view: 0, count_like: 0, count_collect: 0, author: '',
      })), null, 2), 'utf-8');
      console.error(`  ✅ DOM: Saved ${cards.length} works`);
    }
    
  } catch(e) {
    console.error(`  ❌ ERROR: ${e.message}`);
  }
  
  await context.close();
}

await browser.close();
console.error('Done!');
