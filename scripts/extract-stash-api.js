const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const STASH_ID = process.argv[2] || '130';
const OUTPUT_FILE = path.join(__dirname, `../../src/data/stash${STASH_ID}.json`);

(async () => {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
  });

  const page = await browser.newPage();
  
  // 监听网络响应
  let apiData = null;
  page.on('response', async (response) => {
    const url = response.url();
    // 匹配新片场 API（根据观察到的模式）
    if (url.includes('/api/') && url.includes('bookmark')) {
      try {
        const data = await response.json();
        if (data && data.data && data.data.list) {
          apiData = data.data.list;
          console.log(`✅ 捕获到 API 数据: ${url}`);
          console.log(`   作品数量: ${apiData.length}`);
        }
      } catch (e) {
        // 忽略非 JSON 响应
      }
    }
  });

  console.log(`🌐 导航到 Stash ${STASH_ID}...`);
  await page.goto(`https://www.xinpianchang.com/bookmark/${STASH_ID}?from=userBookmark`, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // 等待数据加载（使用 setTimeout 替代已弃用的 waitForTimeout）
  await new Promise(resolve => setTimeout(resolve, 3000));

  if (apiData) {
    console.log(`💾 保存 ${apiData.length} 条数据到 ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(apiData, null, 2));
    console.log('✅ 完成！');
  } else {
    console.log('❌ 未捕获到 API 数据，尝试从 DOM 提取...');
    const data = await page.evaluate(() => {
      // 从页面 DOM 中提取作品数据
      const items = [];
      document.querySelectorAll('a[href*="/a"]').forEach(link => {
        const href = link.href;
        const idMatch = href.match(/\/a(\d+)/);
        if (idMatch) {
          items.push({
            id: parseInt(idMatch[1]),
            title: link.title || link.innerText.trim(),
            cover: link.querySelector('img')?.src || '',
            url: href,
          });
        }
      });
      return items;
    });
    
    if (data.length > 0) {
      console.log(`💾 从 DOM 提取 ${data.length} 条数据...`);
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
      console.log('✅ 完成！');
    } else {
      console.log('❌ 无法提取数据');
    }
  }

  await browser.disconnect();
})();
