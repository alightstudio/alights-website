import puppeteer from 'puppeteer-core';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const CDP_PORT = 9222;
const STASH_MAP = {
  '168': '2099341',
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
  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${CDP_PORT}`,
    defaultViewport: null,
  });
  console.error('Connected to Chrome');

  for (const [stashId, bookmarkId] of Object.entries(STASH_MAP)) {
    const outPath = `src/data/stash${stashId}.json`;

    // Skip if already has good data
    if (existsSync(outPath)) {
      try {
        const existing = JSON.parse(readFileSync(outPath, 'utf-8'));
        const withTitle = existing.filter(w => w.title).length;
        if (withTitle > existing.length * 0.8) {
          console.error(`stash-${stashId}: ${withTitle}/${existing.length} titled, skipping`);
          continue;
        }
      } catch {}
    }

    const url = `https://www.xinpianchang.com/bookmark/${bookmarkId}`;
    console.error(`\nFetching stash ${stashId}: ${url}...`);

    let page;
    try {
      page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));

      // Scroll to load all content
      let prevHeight = 0;
      for (let i = 0; i < 25; i++) {
        const h = await page.evaluate(() => document.body.scrollHeight);
        if (h === prevHeight) break;
        prevHeight = h;
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 800));
      }
      await new Promise(r => setTimeout(r, 2000));

      // Extract works from the page
      // Pattern: Each work has multiple <a> tags with same href, one has stats, one has title
      const works = await page.evaluate(() => {
        const workMap = new Map();
        
        const allLinks = Array.from(document.querySelectorAll('a[href*="from=articleCollectDetail"]'));
        
        for (const link of allLinks) {
          const href = link.getAttribute('href') || '';
          const m = href.match(/\/a(\d+)/);
          if (!m) continue;
          const id = parseInt(m[1]);
          
          const text = (link.textContent || '').trim();
          if (!text) continue;
          
          if (!workMap.has(id)) {
            workMap.set(id, { id, title: '', cover: '', web_url: `https://www.xinpianchang.com/a${id}`, duration: 0, categories: '', count_view: 0, count_like: 0, count_collect: 0, author: '栖光文化', publish_time: 0 });
          }
          
          const entry = workMap.get(id);
          
          // Parse stats line: "播放：xxx人气：xxx时长：mm:ss"
          if (text.includes('播放') || text.includes('人气') || text.includes('时长')) {
            const viewM = text.match(/播放[：:]\s*(\d[\d,]*)/);
            if (viewM) entry.count_view = parseInt(viewM[1].replace(/,/g, '')) || 0;
            
            const likeM = text.match(/人气[：:]\s*(\d[\d,]*)/);
            if (likeM) entry.count_like = parseInt(likeM[1].replace(/,/g, '')) || 0;
            
            const durM = text.match(/时长[：:]\s*(\d+):(\d+)/);
            if (durM) entry.duration = parseInt(durM[1]) * 60 + parseInt(durM[2]);
          }
          
          // Title: lines that aren't stats and have meaningful content
          if (!text.includes('播放') && !text.includes('人气') && !text.includes('时长') && text.length > 2 && text.length < 200) {
            // Skip category-like strings (短, e.g. "三维CG-三维动画")
            if (entry.title) {
              // Could be categories
              if (text.includes('-') && text.length < 20) {
                entry.categories = text;
              }
            } else {
              entry.title = text;
            }
          }
        }
        
        // Also get cover images - find links with images
        const imgLinks = Array.from(document.querySelectorAll('a[href*="from=articleCollectDetail"]'));
        for (const link of imgLinks) {
          const href = link.getAttribute('href') || '';
          const m = href.match(/\/a(\d+)/);
          if (!m) continue;
          const id = parseInt(m[1]);
          if (!workMap.has(id)) continue;
          
          const entry = workMap.get(id);
          if (!entry.cover) {
            const img = link.querySelector('img');
            if (img) {
              const src = img.src || img.getAttribute('data-src') || '';
              if (src && !src.includes('avatar') && !src.includes('user')) {
                entry.cover = src;
              }
            }
          }
        }
        
        // Also get categories from the page structure
        // Categories appear after the title in the card, often as "三维CG-三维动画" format
        const catLinks = Array.from(document.querySelectorAll('a[href*="from=articleCollectDetail"]'));
        for (const link of catLinks) {
          const href = link.getAttribute('href') || '';
          const m = href.match(/\/a(\d+)/);
          if (!m) continue;
          const id = parseInt(m[1]);
          if (!workMap.has(id)) continue;
          
          const entry = workMap.get(id);
          const text = (link.textContent || '').trim();
          // Category pattern: "XXX-XXX" short text
          if (text.includes('-') && text.length < 20 && !text.includes('Behind') && !entry.categories) {
            entry.categories = text;
          }
        }
        
        return [...workMap.values()];
      });

      if (works.length > 0) {
        const withTitle = works.filter(w => w.title).length;
        const withCover = works.filter(w => w.cover).length;
        console.error(`  ✅ Found ${works.length} works (title=${withTitle}, cover=${withCover})`);
        
        // Print sample
        works.slice(0, 3).forEach(w => {
          console.error(`    ${w.title || '(no title)'} | ${w.duration}s | views=${w.count_view} | cat=${w.categories}`);
        });
        
        writeFileSync(outPath, JSON.stringify(works, null, 2));
        console.error(`  Saved to ${outPath}`);
      } else {
        console.error(`  ❌ No works found`);
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
