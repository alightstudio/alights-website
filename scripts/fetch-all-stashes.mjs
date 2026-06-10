import puppeteer from 'puppeteer-core';
import fs from 'fs';

const TARGET_RANGE = { start: 110, end: 177 };
const OUT_DIR = 'src/data';
const BOOKMARK_LIST = 'https://www.xinpianchang.com/u12018057/bookmark';

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('Connecting to CDP...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });

  // Step 1: Get all stash IDs
  console.log('Step 1: Getting stash IDs...');
  let stashMap = {};
  
  const listPage = await browser.newPage();
  await listPage.goto(BOOKMARK_LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(5000);

  for (let k = 0; k < 10; k++) {
    const visible = await listPage.evaluate(() => {
      var links = document.querySelectorAll('a');
      var stashes = [];
      for (var i = 0; i < links.length; i++) {
        var text = links[i].textContent.trim();
        if (text.indexOf('Stash ') === 0) {
          var m = links[i].href.match(/\/bookmark\/(\d+)/);
          if (m) stashes.push({ num: parseInt(text.replace('Stash ', '')), id: m[1] });
        }
      }
      return stashes;
    });

    visible.forEach(s => {
      if (s.num >= TARGET_RANGE.start && s.num <= TARGET_RANGE.end) stashMap[s.num] = s.id;
    });

    const total = TARGET_RANGE.end - TARGET_RANGE.start + 1;
    console.log(`  Click ${k + 1}: ${Object.keys(stashMap).length}/${total} stashes`);
    if (Object.keys(stashMap).length >= total) break;

    const clicked = await listPage.evaluate(() => {
      var btns = document.querySelectorAll('button');
      for (var k = 0; k < btns.length; k++) {
        if (btns[k].textContent.trim() === '加载更多') { btns[k].click(); return true; }
      }
      return false;
    });
    if (!clicked) break;
    await delay(4000);
  }
  await listPage.close();

  console.log(`Found ${Object.keys(stashMap).length} stash IDs\n`);

  // Step 2: Extract data with human-like delays
  const stashNums = Object.keys(stashMap).map(Number).sort((a, b) => a - b);
  let totalWorks = 0;
  const failedStashes = [];
  let consecutiveSuccess = 0;

  for (let si = 0; si < stashNums.length; si++) {
    const stashNum = stashNums[si];
    const realId = stashMap[stashNum];
    const url = `https://www.xinpianchang.com/bookmark/${realId}?from=userBookmark`;

    // Rate limiting: after 5 successful fetches, take a longer break
    if (consecutiveSuccess >= 5) {
      console.log(`  ⏸️  Taking a 15s break to avoid rate limiting...`);
      await delay(15000);
      consecutiveSuccess = 0;
    }

    console.log(`[${si + 1}/${stashNums.length}] Stash ${stashNum} (ID: ${realId})`);

    // Create fresh page for each stash
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await delay(4000);

      // Scroll a bit to look human
      await page.evaluate(() => window.scrollBy(0, 300));
      await delay(500);

      // Check for __NEXT_DATA__
      const hasData = await page.evaluate(() => {
        return !!(window.__NEXT_DATA__ && window.__NEXT_DATA__.props && window.__NEXT_DATA__.props.pageProps);
      });

      if (!hasData) {
        console.log(`  ⚠️ Security challenge / no data. Closing, waiting 20s, retrying...`);
        await page.close();
        await delay(20000);

        // Retry with new page
        const retryPage = await browser.newPage();
        await retryPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await delay(5000);

        const retryHasData = await retryPage.evaluate(() => {
          return !!(window.__NEXT_DATA__ && window.__NEXT_DATA__.props && window.__NEXT_DATA__.props.pageProps);
        });

        if (!retryHasData) {
          console.log(`  ❌ Still no data after retry. Skipping.`);
          await retryPage.close();
          failedStashes.push(stashNum);
          consecutiveSuccess = 0;
          continue;
        }
        // Use retried page
        const items = await extractItems(retryPage);
        await saveItems(stashNum, items);
        printSample(items);
        totalWorks += items.length;
        consecutiveSuccess++;
        await retryPage.close();
      } else {
        const items = await extractItems(page);
        await saveItems(stashNum, items);
        printSample(items);
        totalWorks += items.length;
        consecutiveSuccess++;
        await page.close();
      }

      // Delay between stashes (longer for older stashes to be gentle)
      const stashDelay = stashNum <= 130 ? 5000 : 3000;
      await delay(stashDelay);

    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
      await page.close().catch(() => {});
      failedStashes.push(stashNum);
      consecutiveSuccess = 0;
    }
  }

  await browser.disconnect();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Done! ${totalWorks} works from ${stashNums.length - failedStashes.length}/${stashNums.length} stashes`);
  if (failedStashes.length > 0) {
    console.log(`❌ Failed (${failedStashes.length}): ${failedStashes.join(', ')}`);
  }
}

async function extractItems(page) {
  return await page.evaluate(() => {
    var data = window.__NEXT_DATA__;
    var list = (data.props.pageProps.detail && data.props.pageProps.detail.list) || [];
    var items = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i].item;
      if (!item) continue;

      // Author
      var author = item.author || {};
      var authorStr = '未知', authorRole = '', authorAvatar = '', authorId = '', authorAbout = '', authorOccupation = '', authorWebUrl = '';
      if (author) {
        var ui = author.userinfo || {};
        if (ui.username) authorStr = ui.username;
        else if (typeof author === 'string') authorStr = author;
        if (author.role) authorRole = author.role;
        if (ui.avatar) authorAvatar = ui.avatar;
        if (ui.id) authorId = String(ui.id);
        if (ui.about) authorAbout = ui.about;
        if (ui.occupation) authorOccupation = ui.occupation;
        if (ui.web_url) authorWebUrl = ui.web_url;
      }

      // Categories
      var categories = item.categories || [];
      var catName = '', catSubName = '';
      var allCategories = [];
      for (var ci = 0; ci < categories.length; ci++) {
        var c = categories[ci];
        var cn = '';
        if (c.category_name) cn = c.category_name;
        else if (c.name) cn = c.name;
        else if (typeof c === 'string') cn = c;
        if (cn) allCategories.push(cn);
        if (ci === 0) {
          catName = cn;
          if (c.sub && c.sub.category_name) catSubName = c.sub.category_name;
        }
      }

      // Tags
      var tags = item.tags || [];
      var tagNames = [];
      for (var ti = 0; ti < tags.length; ti++) {
        if (tags[ti].name) tagNames.push(tags[ti].name);
        else if (typeof tags[ti] === 'string') tagNames.push(tags[ti]);
      }

      // Count
      var count = item.count || {};
      var countView = count.count_view || count.view || 0;
      var countLike = count.count_like || count.like || 0;
      var countCollect = count.count_collect || count.collect || 0;
      var countScore = count.score || 0;
      var countComment = count.count_comment || count.comment || 0;
      var countShare = count.count_share || count.share || 0;

      // Video
      var video = item.video || {};
      var videoVid = video.vid || item.vid || '';

      items.push({
        id: item.id,
        title: item.title || '未命名',
        cover: item.cover || '',
        duration: item.duration || 0,
        web_url: item.web_url || '',
        publish_time: item.publish_time || 0,
        count_view: countView,
        count_like: countLike,
        count_collect: countCollect,
        count_score: countScore,
        count_comment: countComment,
        count_share: countShare,
        author: authorStr,
        author_role: authorRole,
        author_avatar: authorAvatar,
        author_id: authorId,
        author_about: authorAbout,
        author_occupation: authorOccupation,
        author_web_url: authorWebUrl,
        categories: catName,
        categories_all: allCategories,
        categories_sub: catSubName,
        tags: tagNames,
        screen_type: item.screen_type || 0,
        ip_location: item.ip_location || '',
        quality: item.quality || 0,
        content: item.content || '',
        resolution_type: item.resolution_type || '',
        video_vid: videoVid,
      });
    }
    return items;
  });
}

function saveItems(stashNum, items) {
  const filePath = `${OUT_DIR}/stash${stashNum}.json`;
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
  console.log(`  ✅ ${items.length} works → stash${stashNum}.json`);
}

function printSample(items) {
  if (items.length > 0) {
    const s = items[0];
    console.log(`     tags: ${JSON.stringify((s.tags || []).slice(0, 3))}`);
    console.log(`     author_role: "${s.author_role}" avatar: ${s.author_avatar ? '✓' : '✗'}`);
    console.log(`     comments: ${s.count_comment} shares: ${s.count_share} screen: ${s.screen_type}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
