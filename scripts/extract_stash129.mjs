import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const pages = await browser.pages();
const page = pages[0];

await page.goto('https://www.xinpianchang.com/bookmark/2123285?from=userBookmark', { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
await new Promise(r => setTimeout(r, 5000));

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
    var cats = item.categories;
    var catStr = '';
    if (cats && cats.length > 0) {
      if (cats[0].category_name) catStr = cats[0].category_name;
      else if (cats[0].name) catStr = cats[0].name;
      else if (typeof cats[0] === 'string') catStr = cats[0];
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

fs.writeFileSync('src/data/stash129.json', JSON.stringify(result, null, 2));
console.log(`Stash 129: ${result.length}条`);
let views = 0;
for (const item of result) { if (item.count_view > 0) views++; }
console.log(`统计: views=${views}/${result.length}`);

await browser.disconnect();
