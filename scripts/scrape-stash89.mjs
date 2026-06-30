// Scrape stash 89 data
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browserURL = 'http://127.0.0.1:9222';
const STASH_ID = '2245643'; // stash 89

async function main() {
  const browser = await puppeteer.connect({ browserURL });
  const page = await browser.newPage();

  const url = 'https://www.xinpianchang.com/bookmark/' + STASH_ID + '?from=userBookmark';
  console.log('Fetching stash 89 from', url);
  
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  const items = await page.evaluate(() => {
    const data = window.__NEXT_DATA__;
    if (!data) return null;
    const list = data.props.pageProps.detail.list;
    if (!list || !list.length) return [];

    const result = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i].item;
      if (!item) continue;

      const author = item.author;
      let authorStr = '未知';
      if (author) {
        if (author.userinfo && author.userinfo.username) authorStr = author.userinfo.username;
        else if (typeof author === 'string') authorStr = author;
      }

      const categories = item.categories;
      let catStr = '';
      if (categories && categories.length > 0) {
        if (categories[0].category_name) catStr = categories[0].category_name;
        else if (categories[0].name) catStr = categories[0].name;
        else if (typeof categories[0] === 'string') catStr = categories[0];
      }

      const count = item.count || {};

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

  if (!items) {
    console.log('❌ No __NEXT_DATA__ found');
    await browser.disconnect();
    return;
  }

  const valid = items.filter(i => i.cover && i.title && i.title !== '未命名');
  if (valid.length !== items.length) {
    console.log('Filtered: ' + items.length + ' → ' + valid.length + ' valid items');
  }

  fs.writeFileSync('src/data/stash89.json', JSON.stringify(valid, null, 2));
  console.log('✅ Saved ' + valid.length + ' items to src/data/stash89.json');

  await browser.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
