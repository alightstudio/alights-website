import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const pages = await browser.pages();
const page = pages[0];

async function extractStash(name, bookmarkId) {
  console.log(`\n===== Stash ${name} (ID=${bookmarkId}) =====`);
  
  await page.goto(`https://www.xinpianchang.com/bookmark/${bookmarkId}?from=userBookmark`, { waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 5000));
  
  // Debug: check page state
  const debug = await page.evaluate(() => {
    var nd = window.__NEXT_DATA__;
    if (!nd) return { error: 'no __NEXT_DATA__' };
    if (!nd.props) return { error: 'no props', keys: Object.keys(nd) };
    if (!nd.props.pageProps) return { error: 'no pageProps', propsKeys: Object.keys(nd.props) };
    if (!nd.props.pageProps.detail) return { error: 'no detail', pageKeys: Object.keys(nd.props.pageProps) };
    return { ok: true, listLen: nd.props.pageProps.detail.list ? nd.props.pageProps.detail.list.length : 0 };
  });
  console.log('  Debug:', JSON.stringify(debug));
  
  if (debug.error) return;
  
  const result = await page.evaluate(() => {
    try {
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
          id: item.id, title: item.title || '未命名', cover: item.cover || '',
          duration: item.duration || 0,
          count_view: count.count_view || 0,
          count_like: count.count_like || 0,
          count_collect: count.count_collect || 0,
          count_score: count.score || 0,
          author: authorStr, categories: catStr,
          web_url: item.web_url || '', publish_time: item.publish_time || 0
        });
      }
      return items;
    } catch(e) { return { error: e.message }; }
  });
  
  if (result.error) {
    console.log(`  ❌ ${result.error}`);
    return;
  }
  
  const path = `src/data/stash${name}.json`;
  fs.writeFileSync(path, JSON.stringify(result, null, 2));
  console.log(`  ✅ ${result.length}条 → ${path}`);
  
  let views = 0, likes = 0, cats = 0, scores = 0;
  for (const item of result) {
    if (item.count_view > 0) views++;
    if (item.count_like > 0) likes++;
    if (item.categories) cats++;
    if (item.count_score > 0) scores++;
  }
  console.log(`  统计: views=${views}/${result.length} likes=${likes}/${result.length} cats=${cats}/${result.length} scores=${scores}/${result.length}`);
}

await extractStash('128', '2124196');
await extractStash('129', '2123285');

await browser.disconnect();
console.log('\n完成!');
