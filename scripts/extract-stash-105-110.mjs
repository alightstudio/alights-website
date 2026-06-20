import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP_URL = 'http://127.0.0.1:9222';
const OUT_DIR = 'src/data';

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL });
  
  // Find the bookmark page
  let pages = await browser.pages();
  let bookmarkPage = pages.find(p => p.url().includes('/u12018057/bookmark'));
  if (!bookmarkPage) {
    console.log('Bookmark page not found!');
    await browser.disconnect();
    return;
  }
  console.log('Found bookmark page:', bookmarkPage.url());

  // Step 1: Click "加载更多" more times to reveal ALL stashes (including 108-110)
  console.log('Step 1: Loading all stash collections...');
  for (let click = 0; click < 30; click++) {
    const allFound = await bookmarkPage.evaluate(() => {
      var links = document.querySelectorAll('a');
      for (var i = 0; i < links.length; i++) {
        if (links[i].textContent.trim() === 'Stash 108') return true;
      }
      return false;
    });
    if (allFound) { console.log('  Stash 108 visible!'); break; }

    const clicked = await bookmarkPage.evaluate(() => {
      var btns = document.querySelectorAll('button');
      for (var k = 0; k < btns.length; k++) {
        if (btns[k].textContent.trim() === '加载更多') { btns[k].click(); return true; }
      }
      return false;
    });
    if (!clicked) { console.log('  No more load buttons.'); break; }
    console.log(`  Clicked load more (${click + 1})`);
    await new Promise(r => setTimeout(r, 4000));
  }

  // Step 2: Get ALL stash links (100-110)
  console.log('Step 2: Finding stash links...');
  const stashInfo = await bookmarkPage.evaluate(() => {
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
          result[num] = { id: idMatch ? idMatch[1] : null, selector: i };
        }
      }
    }
    return result;
  });
  console.log('  Found:', Object.keys(stashInfo).sort((a,b)=>a-b));

  // Step 3: Extract each stash by clicking from the list (avoids security check)
  // We'll process stashes that haven't been extracted yet
  const alreadyDone = [100, 101, 102, 103, 104];
  const toExtract = [105, 106, 107, 108, 109, 110];
  
  for (const stashNum of toExtract) {
    const info = stashInfo[stashNum];
    if (!info) {
      console.log(`  ⚠️ Stash ${stashNum} not found in list, skipping.`);
      continue;
    }

    console.log(`\nStep 3: Extracting stash ${stashNum} (ID: ${info.id})...`);
    
    // Click the stash link in the bookmark page
    // Use evaluate to click and wait for new page
    const clickResult = await bookmarkPage.evaluate((num) => {
      var links = document.querySelectorAll('a');
      for (var i = 0; i < links.length; i++) {
        if (links[i].textContent.trim() === 'Stash ' + num) {
          links[i].click();
          return true;
        }
      }
      return false;
    }, stashNum);

    if (!clickResult) {
      console.log(`  ❌ Failed to click Stash ${stashNum}`);
      continue;
    }

    // Wait for new page to appear
    await new Promise(r => setTimeout(r, 5000));
    
    // Find the stash page
    let allPages = await browser.pages();
    let stashPage = allPages.find(p => p.url().includes('/bookmark/' + info.id));
    
    if (!stashPage) {
      // Try again with longer wait
      await new Promise(r => setTimeout(r, 5000));
      allPages = await browser.pages();
      stashPage = allPages.find(p => p.url().includes('/bookmark/' + info.id));
    }

    if (!stashPage) {
      console.log(`  ❌ Cannot find stash ${stashNum} page after click`);
      continue;
    }

    console.log(`  Page URL: ${stashPage.url()}`);

    // Wait for page to fully load
    try {
      await stashPage.waitForFunction(() => {
        return typeof window.__NEXT_DATA__ !== 'undefined' && window.__NEXT_DATA__ !== null;
      }, { timeout: 30000 });
      console.log('  __NEXT_DATA__ found!');
    } catch (e) {
      // Check if it's security check page
      const title = await stashPage.evaluate(() => document.title);
      console.log(`  ⚠️ Page title: "${title}", no __NEXT_DATA__`);
      
      // Try refreshing
      console.log('  Trying refresh...');
      await stashPage.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise(r => setTimeout(r, 10000));
      
      try {
        await stashPage.waitForFunction(() => {
          return typeof window.__NEXT_DATA__ !== 'undefined' && window.__NEXT_DATA__ !== null;
        }, { timeout: 30000 });
        console.log('  __NEXT_DATA__ found after refresh!');
      } catch (e2) {
        const title2 = await stashPage.evaluate(() => document.title);
        console.log(`  ❌ Still no __NEXT_DATA__. Title: "${title2}". Skipping.`);
        await stashPage.close();
        continue;
      }
    }

    // Extract data
    const items = await stashPage.evaluate(() => {
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

    console.log(`  ✅ Extracted ${items.length} items`);
    const outPath = `${OUT_DIR}/stash${stashNum}.json`;
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2));
    console.log(`  💾 Saved to ${outPath}`);

    // Close the stash page and go back to bookmark page
    await stashPage.close();
    // Re-find bookmark page (it might have changed)
    await new Promise(r => setTimeout(r, 2000));
  }

  await browser.disconnect();
  console.log('\n✅ All done!');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
