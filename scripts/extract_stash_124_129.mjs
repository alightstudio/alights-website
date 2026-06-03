import puppeteer from 'puppeteer-core';
import fs from 'fs';

const STASHES = [
  { name: '124', bookmarkId: '2152044' },
  { name: '125', bookmarkId: '2145525' },
  { name: '126', bookmarkId: '2138345' },
  { name: '127', bookmarkId: '2130558' },
  { name: '128', bookmarkId: '2124196' },
  { name: '129', bookmarkId: '2123285' },
];

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const pages = await browser.pages();
const page = pages[0];

async function extractStash(name, bookmarkId) {
  console.log(`\n===== Stash ${name} (ID=${bookmarkId}) =====`);
  
  await page.goto(`https://www.xinpianchang.com/bookmark/${bookmarkId}?from=userBookmark`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 4000));
  
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
    } catch(e) { return { error: e.message }; }
  });
  
  if (result.error) {
    console.log(`  ❌ 错误: ${result.error}`);
    return;
  }
  
  const path = `src/data/stash${name}.json`;
  fs.writeFileSync(path, JSON.stringify(result, null, 2));
  console.log(`  ✅ ${result.length}条 → ${path}`);
  
  const issues = [];
  for (let i = 0; i < result.length; i++) {
    const item = result[i];
    if (!item.cover) issues.push(`[${i}] 无封面`);
    if (!item.title) issues.push(`[${i}] 无标题`);
    if (typeof item.author === 'object') issues.push(`[${i}] author是对象`);
    if (!item.count_score) issues.push(`[${i}] score=0`);
    if (!item.count_view) issues.push(`[${i}] view=0`);
  }
  console.log(`  质量: ${issues.length}个问题`);
  for (const issue of issues.slice(0, 5)) console.log(`    ⚠️ ${issue}`);
  
  let views = 0, likes = 0, cats = 0, scores = 0;
  for (const item of result) {
    if (item.count_view > 0) views++;
    if (item.count_like > 0) likes++;
    if (item.categories) cats++;
    if (item.count_score > 0) scores++;
  }
  console.log(`  统计: views=${views}/${result.length} likes=${likes}/${result.length} cats=${cats}/${result.length} scores=${scores}/${result.length}`);
}

for (const s of STASHES) {
  await extractStash(s.name, s.bookmarkId);
}

await browser.disconnect();
console.log('\n全部完成!');
