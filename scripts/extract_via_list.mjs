import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const pages = await browser.pages();
const page = pages[0];

async function extractViaList(name) {
  console.log(`\n===== Stash ${name} =====`);
  
  // Navigate to bookmark list first
  await page.goto('https://www.xinpianchang.com/u12018057/bookmark', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 4000));
  
  // Click "加载更多" until we see the target stash
  for (let tryCount = 0; tryCount < 3; tryCount++) {
    const found = await page.evaluate((n) => {
      var links = document.querySelectorAll('a');
      for (var i = 0; i < links.length; i++) {
        if (links[i].textContent.trim() === 'Stash ' + n) return links[i].href;
      }
      return null;
    }, name);
    
    if (found) {
      console.log(`  找到链接: ${found}`);
      
      // Navigate via href (same domain, so cookies work)
      await page.goto(found, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 5000));
      
      // Check if loaded
      const debug = await page.evaluate(() => {
        var nd = window.__NEXT_DATA__;
        if (!nd) return { error: 'no __NEXT_DATA__' };
        if (!nd.props || !nd.props.pageProps || !nd.props.pageProps.detail) return { error: 'no data' };
        return { ok: true, len: nd.props.pageProps.detail.list.length };
      });
      console.log(`  Debug: ${JSON.stringify(debug)}`);
      
      if (debug.ok) {
        // Extract!
        const result = await page.evaluate(() => {
          var list = window.__NEXT_DATA__.props.pageProps.detail.list;
          var items = [];
          for (var i = 0; i < list.length; i++) {
            var item = list[i].item;
            var author = item.author;
            var authorStr = '未知';
            if (author) {
              if (author.userinfo && author.userinfo.username) authorStr = author.userinfo.username;
              else if (typeof author === 'string') authorStr = author;
            }
            var categories = item.categories;
            var catStr = '';
            if (categories && categories.length > 0) {
              if (categories[0].category_name) catStr = categories[0].category_name;
              else if (categories[0].name) catStr = categories[0].name;
              else if (typeof categories[0] === 'string') catStr = categories[0];
            }
            var count = item.count || {};
            items.push({
              id: item.id, title: item.title || '未命名', cover: item.cover || '',
              duration: item.duration || 0,
              count_view: count.count_view || 0, count_like: count.count_like || 0,
              count_collect: count.count_collect || 0, count_score: count.score || 0,
              author: authorStr, categories: catStr,
              web_url: item.web_url || '', publish_time: item.publish_time || 0
            });
          }
          return items;
        });
        
        const path = `src/data/stash${name}.json`;
        fs.writeFileSync(path, JSON.stringify(result, null, 2));
        console.log(`  ✅ ${result.length}条 → ${path}`);
        
        let views = 0, likes = 0;
        for (const item of result) { if (item.count_view > 0) views++; if (item.count_like > 0) likes++; }
        console.log(`  统计: views=${views}/${result.length} likes=${likes}/${result.length}`);
        return;
      }
      break;
    }
    
    // Click load more
    const clicked = await page.evaluate(() => {
      var btns = document.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].textContent.trim() === '加载更多') { btns[i].click(); return true; }
      }
      return false;
    });
    if (!clicked) { console.log('  没有更多加载按钮了'); break; }
    await new Promise(r => setTimeout(r, 4000));
  }
}

await extractViaList('128');
await extractViaList('129');

await browser.disconnect();
console.log('\n完成!');
