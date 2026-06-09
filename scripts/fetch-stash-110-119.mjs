import puppeteer from 'puppeteer-core';
import fs from 'fs';

const TARGET_STASHES = [110, 111, 112, 113, 114, 115, 116, 117, 118, 119];
const OUT_DIR = 'src/data';

async function main() {
  console.log('Connecting to CDP...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('xinpianchang')) || pages[0];
  
  // Step 1: Navigate to bookmark list and get real IDs
  console.log('Navigating to bookmark list...');
  await page.goto('https://www.xinpianchang.com/u12018057/bookmark', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));

  // Click "加载更多" multiple times to reveal all stashes
  for (let k = 0; k < 4; k++) {
    const visible = await page.evaluate(() => {
      var links = document.querySelectorAll('a');
      var stashes = [];
      for (var i = 0; i < links.length; i++) {
        var text = links[i].textContent.trim();
        if (text.indexOf('Stash ') === 0) {
          var m = links[i].href.match(/\/bookmark\/(\d+)/);
          stashes.push({ name: text, num: parseInt(text.replace('Stash ', '')), id: m ? m[1] : null });
        }
      }
      return stashes;
    });
    
    const foundAll = TARGET_STASHES.every(n => visible.some(s => s.num === n));
    console.log(`Click ${k + 1}: found ${visible.length} stashes, range ${visible.map(s => s.num).sort((a,b) => a-b)[0]}-${visible.map(s => s.num).sort((a,b) => a-b)[visible.length-1]}`);
    
    if (foundAll) {
      console.log('All target stashes found!');
      
      // Extract IDs for target stashes
      const stashMap = {};
      TARGET_STASHES.forEach(n => {
        const s = visible.find(v => v.num === n);
        if (s) stashMap[n] = s.id;
      });
      console.log('Stash IDs:', JSON.stringify(stashMap, null, 2));
      
      // Step 2: Fetch data from each stash
      for (const stashNum of TARGET_STASHES) {
        const realId = stashMap[stashNum];
        if (!realId) { console.log(`⚠️ Stash ${stashNum} not found!`); continue; }
        
        console.log(`\n--- Fetching Stash ${stashNum} (ID: ${realId}) ---`);
        await page.goto(`https://www.xinpianchang.com/bookmark/${realId}?from=userBookmark`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 4000));
        
        // Check for security challenge
        const hasNextData = await page.evaluate(() => !!window.__NEXT_DATA__);
        if (!hasNextData) {
          console.log(`⚠️ Stash ${stashNum}: No __NEXT_DATA__! Might need manual bypass.`);
          // Try waiting longer
          await new Promise(r => setTimeout(r, 5000));
          const retry = await page.evaluate(() => !!window.__NEXT_DATA__);
          if (!retry) {
            console.log(`❌ Stash ${stashNum}: Still no __NEXT_DATA__ after retry. Skipping.`);
            continue;
          }
        }
        
        // Extract data
        const items = await page.evaluate(() => {
          var data = window.__NEXT_DATA__;
          var list = data.props.pageProps.detail.list;
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
              id: item.id,
              title: item.title || '未命名',
              cover: item.cover || '',
              duration: item.duration || 0,
              count_view: count.count_view || 0,
              count_like: count.count_like || 0,
              count_collect: count.count_collect || 0,
              count_score: count.score || 0,
              author: authorStr,
              categories: catStr,
              web_url: item.web_url || '',
              publish_time: item.publish_time || 0
            });
          }
          return items;
        });
        
        console.log(`Stash ${stashNum}: ${items.length} items extracted`);
        fs.writeFileSync(`${OUT_DIR}/stash${stashNum}.json`, JSON.stringify(items, null, 2));
      }
      
      break;
    }
    
    // Click "加载更多"
    const clicked = await page.evaluate(() => {
      var btns = document.querySelectorAll('button');
      for (var k = 0; k < btns.length; k++) {
        if (btns[k].textContent.trim() === '加载更多') { btns[k].click(); return true; }
      }
      return false;
    });
    if (!clicked) { console.log('No more "加载更多" button'); break; }
    await new Promise(r => setTimeout(r, 4000));
  }

  await browser.disconnect();
  console.log('\n✅ Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
