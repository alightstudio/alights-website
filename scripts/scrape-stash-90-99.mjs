// Extract stash 90-99 bookmark IDs from newpianchang, then fetch data
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browserURL = 'http://127.0.0.1:9222';

async function main() {
  const browser = await puppeteer.connect({ browserURL });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('bookmark')) || pages[0];
  
  // Step 1: get stash 90-99 real IDs from bookmark list page
  const stashIds = await page.evaluate(function() {
    var links = document.querySelectorAll('a');
    var result = {};
    for (var i = 0; i < links.length; i++) {
      var t = links[i].textContent.trim();
      var m = t.match(/^Stash\s+(9\d)$/);
      if (m) {
        var hrefM = links[i].href.match(/\/bookmark\/(\d+)/);
        if (hrefM) result[m[1]] = hrefM[1];
      }
    }
    return result;
  });
  
  console.log('Found stash IDs:', stashIds);

  // Step 2: fetch each stash
  for (var n = 90; n <= 99; n++) {
    var stashKey = String(n);
    var id = stashIds[stashKey];
    if (!id) {
      console.log('MISSING stash', stashKey);
      continue;
    }
    
    var url = 'https://www.xinpianchang.com/bookmark/' + id + '?from=userBookmark';
    console.log('Fetching stash', stashKey, 'from', url);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(function(r) { setTimeout(r, 4000); });
    
    // Check for security page
    var hasData = await page.evaluate(function() {
      return typeof window.__NEXT_DATA__ !== 'undefined';
    });
    
    if (!hasData) {
      console.log('  ⚠️ Security check page, retrying with xbrowser open...');
      // Try refreshing
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(function(r) { setTimeout(r, 5000); });
      hasData = await page.evaluate(function() {
        return typeof window.__NEXT_DATA__ !== 'undefined';
      });
      if (!hasData) {
        console.log('  ❌ Still no data, skipping stash', stashKey);
        continue;
      }
    }
    
    var items = await page.evaluate(function() {
      var data = window.__NEXT_DATA__;
      if (!data) return [];
      var list = data.props.pageProps.detail.list;
      if (!list || !list.length) return [];
      
      var result = [];
      for (var i = 0; i < list.length; i++) {
        var item = list[i].item;
        if (!item) continue;
        
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
    
    // Filter out invalid items
    var valid = items.filter(function(i) {
      return i.cover && i.title && i.title !== '未命名';
    });
    
    if (valid.length !== items.length) {
      console.log('  Filtered: ' + items.length + ' → ' + valid.length + ' valid items');
    }
    
    var outPath = 'src/data/stash' + stashKey + '.json';
    fs.writeFileSync(outPath, JSON.stringify(valid, null, 2));
    console.log('  ✅ Saved ' + valid.length + ' items to ' + outPath);
  }
  
  await browser.disconnect();
  console.log('\nDone!');
}

main().catch(function(e) {
  console.error(e);
  process.exit(1);
});
