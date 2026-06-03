import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const pages = await browser.pages();
const page = pages.find(p => p.url().includes('bookmark'));

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
        if (author.userinfo && author.userinfo.username) {
          authorStr = author.userinfo.username;
        } else if (typeof author === 'string') {
          authorStr = author;
        }
      }
      
      var categories = item.categories;
      var catStr = '';
      if (categories && categories.length > 0) {
        if (categories[0].category_name) {
          catStr = categories[0].category_name;
        } else if (categories[0].name) {
          catStr = categories[0].name;
        } else if (typeof categories[0] === 'string') {
          catStr = categories[0];
        }
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

console.log('提取条目数:', result.length);
console.log('第一条:', JSON.stringify(result[0], null, 2));

const outPath = 'src/data/stash177.json';
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log('已保存到:', outPath);

// Quality check
let issues = [];
let stats = { views: 0, likes: 0, collects: 0, cats: 0, scores: 0 };
for (const item of result) {
  if (!item.cover) issues.push(`无封面`);
  if (!item.title) issues.push(`无标题`);
  if (typeof item.author === 'object') issues.push(`author是对象`);
  if (item.count_score === null || item.count_score === undefined) issues.push(`score缺失`);
  if (item.count_view > 0) stats.views++;
  if (item.count_like > 0) stats.likes++;
  if (item.count_collect > 0) stats.collects++;
  if (item.categories) stats.cats++;
  if (item.count_score > 0) stats.scores++;
}
console.log('数据质量:', issues.length, '个问题');
for (const issue of issues) console.log('  ⚠️', issue);
console.log('统计:', `views>0=${stats.views}/${result.length} likes>0=${stats.likes}/${result.length} collects>0=${stats.collects}/${result.length} categories>0=${stats.cats} scores>0=${stats.scores}`);

// Print categories
const cats = [...new Set(result.map(i => i.categories).filter(Boolean))];
console.log('分类:', cats);

await browser.disconnect();
