// Fetch stash 99 data
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browserURL = 'http://127.0.0.1:9222';

async function main() {
  const browser = await puppeteer.connect({ browserURL });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('bookmark')) || pages[0];

  var url = 'https://www.xinpianchang.com/bookmark/2240643?from=userBookmark';
  console.log('Fetching stash 99 from', url);
  
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(function(r) { setTimeout(r, 5000); });

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

  var valid = items.filter(function(i) {
    return i.cover && i.title && i.title !== '未命名';
  });
  
  if (valid.length !== items.length) {
    console.log('Filtered: ' + items.length + ' → ' + valid.length + ' valid items');
  }
  
  fs.writeFileSync('src/data/stash99.json', JSON.stringify(valid, null, 2));
  console.log('✅ Saved ' + valid.length + ' items to src/data/stash99.json');
  
  await browser.disconnect();
}

main().catch(function(e) { console.error(e); process.exit(1); });
