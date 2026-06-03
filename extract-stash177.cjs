const puppeteer = require('puppeteer-core');

async function extract() {
  console.log('连接到浏览器...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:49209',
    defaultViewport: null
  });
  
  const pages = await browser.pages();
  const page = pages[0];
  
  console.log('导航到新片场收藏夹 177...');
  await page.goto('https://www.xinpianchang.com/bookmark/177?from=userBookmark', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  console.log('等待页面加载...');
  await new Promise(r => setTimeout(r, 5000));
  
  // 截图检查
  await page.screenshot({ path: '/tmp/stash177-page.png' });
  console.log('截图保存到 /tmp/stash177-page.png');
  
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
  
  if (data.error) {
    console.error('提取失败:', data.error);
  } else {
    console.log(`成功提取 ${data.length} 条数据`);
    console.log(JSON.stringify(data, null, 2));
  }
  
  await browser.disconnect();
}

extract().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
