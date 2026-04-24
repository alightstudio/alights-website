import { chromium } from 'playwright';

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

const results = [];

for (const { stashId, url } of URLS) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    console.error(`Fetching ${stashId}: ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(5000);
    
    const content = await page.content();
    const match = content.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    
    if (match) {
      const nd = JSON.parse(match[1]);
      const data = nd?.props?.pageProps?.data || nd?.props?.pageProps?.detail || {};
      
      // The data might be a single work or a list
      let works = [];
      if (Array.isArray(data)) {
        works = data;
      } else if (data.videoList || data.list) {
        works = data.videoList || data.list || [];
      } else if (data.videoId) {
        // Single work page
        works = [{
          id: data.videoId,
          videoId: data.videoId,
          title: data.title || '',
          cover: data.cover || data.video_cover || '',
          web_url: `https://www.xinpianchang.com/a${data.videoId}`,
          duration: data.duration || 0,
          categories: data.category_name || '',
          count_view: data.count_view || 0,
          count_like: data.count_like || 0,
          count_collect: data.count_collect || 0,
          author: data.user_name || data.author || '',
          description: data.description || '',
        }];
      }
      
      results.push({ stashId, works, source: 'next_data' });
      console.error(`  OK: ${works.length} works`);
    } else {
      // Try to extract from embedded video data
      console.error(`  No __NEXT_DATA__, trying JSON.parse...`);
      const jsonMatch = content.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/s);
      if (jsonMatch) {
        const state = JSON.parse(jsonMatch[1]);
        console.error(`  INITIAL_STATE found:`, Object.keys(state).slice(0, 5));
      }
      results.push({ stashId, works: [], source: 'none' });
    }
  } catch(e) {
    console.error(`  ERROR: ${e.message}`);
    results.push({ stashId, works: [], source: 'error' });
  }
  
  await browser.close();
}

// Print results as JSON
console.log(JSON.stringify(results, null, 2));
