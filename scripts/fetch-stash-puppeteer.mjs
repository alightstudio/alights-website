import puppeteer from 'puppeteer-core';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const CDP_PORT = 9222;
const STASH_MAP = {
  '167': '2099431',
  '166': '2099457',
  '165': '2099503',
  '164': '2099592',
  '163': '2099730',
  '162': '2099912',
  '161': '2100050',
  '160': '2100140',
};

async function main() {
  // Connect to existing Chrome via CDP
  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${CDP_PORT}`,
    defaultViewport: null,
  });

  console.error('Connected to Chrome');

  for (const [stashId, bookmarkId] of Object.entries(STASH_MAP)) {
    const outPath = `src/data/stash${stashId}.json`;
    
    // Skip if already has good data (with titles)
    if (existsSync(outPath)) {
      try {
        const existing = JSON.parse(readFileSync(outPath, 'utf-8'));
        const withTitle = existing.filter(w => w.title).length;
        if (withTitle > existing.length * 0.5) {
          console.error(`stash-${stashId} already has ${withTitle}/${existing.length} titled works, skipping`);
          continue;
        }
      } catch {}
    }

    const url = `https://www.xinpianchang.com/bookmark/${bookmarkId}`;
    console.error(`\nFetching stash ${stashId}: ${url}...`);

    let page;
    try {
      page = await browser.newPage();
      
      // Intercept network requests to capture API data
      let capturedData = null;
      page.on('response', async (response) => {
        try {
          const rUrl = response.url();
          if (response.status() === 200 && rUrl.includes('/api/')) {
            const json = await response.json();
            // Look for work lists in the response
            const find = (obj, depth = 0) => {
              if (depth > 5 || capturedData) return;
              if (Array.isArray(obj) && obj.length > 3 && obj[0]?.id && obj[0]?.title) {
                capturedData = obj;
                return;
              }
              if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                for (const v of Object.values(obj)) find(v, depth + 1);
              }
            };
            find(json);
          }
        } catch {}
      });

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      console.error('  Page loaded, waiting for content...');
      await new Promise(r => setTimeout(r, 3000));

      // Scroll to load all lazy content
      let prevHeight = 0;
      for (let i = 0; i < 15; i++) {
        const height = await page.evaluate(() => document.body.scrollHeight);
        if (height === prevHeight) break;
        prevHeight = height;
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 1500));
      }
      console.error('  Scrolled to bottom');

      // Wait a bit more for API responses
      await new Promise(r => setTimeout(r, 2000));

      // Method 1: Use captured API data (best quality)
      if (capturedData) {
        console.error(`  ✅ Captured ${capturedData.length} works from API`);
        const normalized = capturedData.map(w => ({
          id: w.id,
          title: w.title || w.videoName || '',
          cover: w.cover || w.video_cover || w.pic || '',
          web_url: w.web_url || `https://www.xinpianchang.com/a${w.id}`,
          duration: w.duration || w.videoDuration || 0,
          categories: w.categories || w.category_name || w.categoryName || '',
          count_view: w.count_view || w.views || 0,
          count_like: w.count_like || w.likes || 0,
          count_collect: w.count_collect || w.collects || 0,
          author: w.author || w.user_name || '栖光文化',
          publish_time: w.publish_time || 0,
        }));
        writeFileSync(outPath, JSON.stringify(normalized, null, 2));
        console.error(`  Saved to ${outPath}`);
        await page.close();
        continue;
      }

      // Method 2: Extract from __NEXT_DATA__
      const nextDataWorks = await page.evaluate(() => {
        const el = document.getElementById('__NEXT_DATA__');
        if (!el) return null;
        try {
          const nd = JSON.parse(el.textContent);
          const props = nd?.props?.pageProps || {};
          
          // Deep search for work arrays
          const find = (obj, depth = 0) => {
            if (depth > 8) return null;
            if (Array.isArray(obj) && obj.length > 3 && obj[0]?.id && obj[0]?.title) {
              return obj;
            }
            if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
              for (const v of Object.values(obj)) {
                const r = find(v, depth + 1);
                if (r) return r;
              }
            }
            return null;
          };
          return find(props);
        } catch { return null; }
      });

      if (nextDataWorks) {
        console.error(`  ✅ __NEXT_DATA__ found ${nextDataWorks.length} works`);
        const normalized = nextDataWorks.map(w => ({
          id: w.id,
          title: w.title || w.videoName || '',
          cover: w.cover || w.video_cover || w.pic || '',
          web_url: w.web_url || `https://www.xinpianchang.com/a${w.id}`,
          duration: w.duration || w.videoDuration || 0,
          categories: w.categories || w.category_name || w.categoryName || '',
          count_view: w.count_view || w.views || 0,
          count_like: w.count_like || w.likes || 0,
          count_collect: w.count_collect || w.collects || 0,
          author: w.author || w.user_name || '栖光文化',
          publish_time: w.publish_time || 0,
        }));
        writeFileSync(outPath, JSON.stringify(normalized, null, 2));
        console.error(`  Saved to ${outPath}`);
        await page.close();
        continue;
      }

      // Method 3: Enhanced DOM scraping
      console.error('  Trying enhanced DOM extraction...');
      const domWorks = await page.evaluate(() => {
        const results = [];
        // Try multiple selector strategies
        const selectors = [
          '.video-card, .work-card, .film-card',
          '[class*="VideoCard"], [class*="WorkCard"], [class*="work-item"]',
          'a[href*="/a"]',
        ];
        
        for (const sel of selectors) {
          const cards = document.querySelectorAll(sel);
          if (cards.length < 3) continue;
          
          cards.forEach(card => {
            const link = card.tagName === 'A' ? card : card.querySelector('a[href*="/a"]');
            if (!link) return;
            const href = link.getAttribute('href') || '';
            const m = href.match(/\/a(\d+)/);
            if (!m) return;
            
            const id = parseInt(m[1]);
            if (results.find(r => r.id === id)) return;
            
            // Get all text content from the card
            const allText = card.textContent || '';
            const img = card.querySelector('img');
            const cover = img?.src || img?.getAttribute('data-src') || '';
            
            // Try to find title specifically
            const titleEl = card.querySelector('[class*="title"], [class*="name"], h3, h4, .title, .name');
            const title = titleEl?.textContent?.trim() || '';
            
            // Duration
            const durEl = card.querySelector('[class*="dur"], [class*="time"], .duration');
            let duration = 0;
            const dm = (durEl?.textContent || '').match(/(\d+):(\d+)/);
            if (dm) duration = parseInt(dm[1]) * 60 + parseInt(dm[2]);
            
            results.push({
              id, title, cover,
              web_url: `https://www.xinpianchang.com/a${id}`,
              duration,
              categories: '',
              count_view: 0, count_like: 0, count_collect: 0,
              author: '栖光文化', publish_time: 0,
            });
          });
          
          if (results.length > 0) break;
        }
        return results;
      });

      if (domWorks.length > 0) {
        console.error(`  DOM extraction: ${domWorks.length} works (titles: ${domWorks.filter(w => w.title).length})`);
        writeFileSync(outPath, JSON.stringify(domWorks, null, 2));
        console.error(`  Saved to ${outPath}`);
      } else {
        console.error(`  ❌ No works found for stash ${stashId}`);
        // Save page content for debugging
        const html = await page.content();
        writeFileSync(`/tmp/stash${stashId}-debug2.html`, html);
        console.error(`  Debug HTML saved`);
      }

    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
    }

    if (page) await page.close();
  }

  browser.disconnect();
  console.error('\n✅ Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
