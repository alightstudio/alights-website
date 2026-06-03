const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function extract() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:49209',
    defaultViewport: null
  });
  const pages = await browser.pages();
  const page = pages[0];
  
  console.log('导航到 Stash 177 (ID: 2161140)...');
  await page.goto('https://www.xinpianchang.com/bookmark/2161140?from=userBookmark', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  console.log('等待页面加载...');
  await new Promise(r => setTimeout(r, 5000));
  
  // 截图
  await page.screenshot({ path: '/tmp/stash177-real.png' });
  console.log('截图保存到 /tmp/stash177-real.png');
  
  // 检查页面 URL 和标题
  const url = page.url();
  const title = await page.title();
  console.log(`当前 URL: ${url}`);
  console.log(`页面标题: ${title}`);
  
  // 提取数据
  console.log('提取数据...');
  const data = await page.evaluate(() => {
    var data = window.__NEXT_DATA__;
    if (!data || !data.props || !data.props.pageProps) {
      return { error: '无法找到 __NEXT_DATA__' };
    }
    var list = data.props.pageProps.detail?.list || [];
    var result = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i].item;
      result.push({
        id: item.id,
        title: item.title,
        cover: item.cover,
        duration: item.duration,
        count_view: item.count.view,
        count_like: item.count.like,
        count_collect: item.count.collect,
        count_score: item.count.score,
        author: item.author && item.author.userinfo ? item.author.userinfo.username : '未知',
        categories: item.categories && item.categories[0] ? item.categories[0].name : '',
        web_url: item.web_url,
        publish_time: item.publish_time
      });
    }
    return result;
  });
  
  if (Array.isArray(data)) {
    console.log(`✅ 成功提取 ${data.length} 条数据`);
    
    // 保存到文件
    const outPath = '/Users/lzc/.qclaw/workspace/alights-website/src/data/stash177.json';
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`数据已保存到: ${outPath}`);
    
    // 显示前3条预览
    console.log('\n前3条数据预览:');
    data.slice(0, 3).forEach((item, idx) => {
      console.log(`  [${idx+1}] ${item.title} (score: ${item.count_score})`);
    });
  } else {
    console.error('❌ 提取失败:', JSON.stringify(data));
  }
  
  await browser.disconnect();
}

extract().catch(err => console.error('错误:', err.message));
