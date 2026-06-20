import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP_URL = 'http://127.0.0.1:9222';
const BOOKMARK_URL = 'https://www.xinpianchang.com/u12018057/bookmark';
const OUT_DIR = 'src/data';

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL });
  
  // Find the bookmark page or open a new one
  let pages = await browser.pages();
  let page = pages.find(p => p.url().includes('bookmark'));
  if (!page) {
    page = await browser.newPage();
    await page.goto(BOOKMARK_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));
  }

  // Step 1: Click "加载更多" until stashes 100-110 appear
  console.log('Step 1: Loading all stash collections...');
  for (let click = 0; click < 20; click++) {
    // Check if stashes 100-110 are already visible
    const found = await page.evaluate(() => {
      var links = document.querySelectorAll('a');
      var found100to110 = false;
      for (var i = 0; i < links.length; i++) {
        var text = links[i].textContent.trim();
        if (text === 'Stash 100' || text === 'Stash 101' || text === 'Stash 102') {
          found100to110 = true;
          break;
        }
      }
      return found100to110;
    });
    
    if (found) {
      console.log('  Stashes 100-110 are now visible!');
      break;
    }

    // Click "加载更多" button
    const clicked = await page.evaluate(() => {
      var btns = document.querySelectorAll('button');
      for (var k = 0; k < btns.length; k++) {
        if (btns[k].textContent.trim() === '加载更多') {
          btns[k].click();
          return true;
        }
      }
      return false;
    });

    if (!clicked) {
      console.log('  No more "加载更多" buttons found.');
      break;
    }
    
    console.log(`  Clicked "加载更多" (${click + 1})`);
    await new Promise(r => setTimeout(r, 4000));
  }

  // Step 2: Extract real bookmark IDs for stashes 100-110
  console.log('Step 2: Finding bookmark IDs for stashes 100-110...');
  const stashIds = await page.evaluate(() => {
    var links = document.querySelectorAll('a');
    var result = {};
    for (var i = 0; i < links.length; i++) {
      var text = links[i].textContent.trim();
      var match = text.match(/^Stash\s+(\d+)$/);
      if (match) {
        var num = parseInt(match[1]);
        if (num >= 100 && num <= 110) {
          var href = links[i].href;
          var idMatch = href.match(/\/bookmark\/(\d+)/);
          if (idMatch) {
            result[num] = idMatch[1];
          }
        }
      }
    }
    return result;
  });

  console.log('  Found IDs:', JSON.stringify(stashIds, null, 2));

  // Step 3: Extract data from each stash
  for (var stashNum = 100; stashNum <= 110; stashNum++) {
    var bookmarkId = stashIds[stashNum];
    if (!bookmarkId) {
      console.log(`  ⚠️ Stash ${stashNum} not found in bookmark list, skipping.`);
      continue;
    }

    console.log(`Step 3: Extracting stash ${stashNum} (bookmark ID: ${bookmarkId})...`);
    var stashUrl = `https://www.xinpianchang.com/bookmark/${bookmarkId}?from=userBookmark`;
    
    var stashPage = await browser.newPage();
    
    try {
      await stashPage.goto(stashUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise(r => setTimeout(r, 5000)); // Wait for __NEXT_DATA__ to load
      
      // Check if we hit the security check
      var hasNextData = await stashPage.evaluate(() => {
        return typeof window.__NEXT_DATA__ !== 'undefined' && window.__NEXT_DATA__ !== null;
      });

      if (!hasNextData) {
        console.log(`  ⚠️ Security check triggered for stash ${stashNum}, trying alternative approach...`);
        
        // Try refreshing and waiting longer
        await stashPage.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 8000));
        
        hasNextData = await stashPage.evaluate(() => {
          return typeof window.__NEXT_DATA__ !== 'undefined' && window.__NEXT_DATA__ !== null;
        });
        
        if (!hasNextData) {
          console.log(`  ❌ Still no __NEXT_DATA__ for stash ${stashNum}, skipping.`);
          await stashPage.close();
          continue;
        }
      }

      var items = await stashPage.evaluate(() => {
        var data = window.__NEXT_DATA__;
        var list = data.props.pageProps.detail.list;
        var result = [];
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
            if (typeof categories[0] === 'object' && categories[0].category_name) catStr = categories[0].category_name;
            else if (typeof categories[0] === 'object' && categories[0].name) catStr = categories[0].name;
            else if (typeof categories[0] === 'string') catStr = categories[0];
          }
          var count = item.count || {};
          result.push({
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
        return result;
      });

      console.log(`  ✅ Extracted ${items.length} items from stash ${stashNum}`);
      
      // Save to file
      var outPath = `${OUT_DIR}/stash${stashNum}.json`;
      fs.writeFileSync(outPath, JSON.stringify(items, null, 2));
      console.log(`  💾 Saved to ${outPath}`);
      
    } catch (err) {
      console.log(`  ❌ Error extracting stash ${stashNum}: ${err.message}`);
    } finally {
      await stashPage.close();
    }
  }

  await browser.disconnect();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
