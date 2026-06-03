import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const pages = await browser.pages();
const page = pages[0];

async function extractStash(name, bookmarkId) {
  console.log(`\n===== Stash ${name} (ID=${bookmarkId}) =====`);
  
  // Check current page
  let currentUrl = await page.url();
  console.log(`  当前URL: ${currentUrl}`);
  
  // Navigate if not already there
  if (!currentUrl.includes(bookmarkId)) {
    await page.goto(`https://www.xinpianchang.com/bookmark/${bookmarkId}?from=userBookmark`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 5000));
  }
  
  const debug = await page.evaluate(() => {
    var nd = window.__NEXT_DATA__;
    console.log('__NEXT_DATA__ exists:', !!nd);
    if (!nd) return { error: 'no __NEXT_DATA__' };
    if (!nd.props) return { error: 'no props' };
    if (!nd.props.pageProps) return { error: 'no pageProps' };
    if (!nd.props.pageProps.detail) return { error: 'no detail' };
    return { ok: true, len: nd.props.pageProps.detail.list.length };
  });
  console.log(`  Debug: ${JSON.stringify(debug)}`);
  
  if (debug.error) return;
  
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
  
  const path = `src/data/stash${name}.json`;
  fs.writeFileSync(path, JSON.stringify(result, null, 2));
  console.log(`  ✅ ${result.length}条 → ${path}`);
  
  let views = 0, scores = 0;
  for (const item of result) {
    if (item.count_view > 0) views++;
    if (item.count_score > 0) scores++;
  }
  console.log(`  统计: views=${views}/${result.length} scores=${scores}/${result.length}`);
}

await extractStash('128', '2124196');
await extractStash('129', '2123285');

await browser.disconnect();
console.log('\n全部完成!');
