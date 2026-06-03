const puppeteer = require('puppeteer-core');

async function check() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:49209',
    defaultViewport: null
  });
  const pages = await browser.pages();
  const page = pages[0];
  
  console.log('导航到收藏夹列表页...');
  await page.goto('https://www.xinpianchang.com/u12018057/bookmark', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: '/tmp/stash-list.png' });
  console.log('截图保存到 /tmp/stash-list.png');
  
  // 提取收藏夹列表
  const result = await page.evaluate(() => {
    var data = window.__NEXT_DATA__;
    if (!data || !data.props || !data.props.pageProps) {
      return { error: '无法找到 __NEXT_DATA__' };
    }
    var pageProps = data.props.pageProps;
    
    // 尝试不同的数据路径
    var keys = Object.keys(pageProps);
    console.log('pageProps keys:', keys);
    
    // 查找收藏夹列表
    if (pageProps.detail && pageProps.detail.list) {
      return { type: 'detail.list', count: pageProps.detail.list.length };
    }
    if (pageProps.bookmarks) {
      return { type: 'bookmarks', count: pageProps.bookmarks.length };
    }
    if (pageProps.stashData) {
      return { type: 'stashData', count: pageProps.stashData.items?.length || 0 };
    }
    
    // 返回所有 key 的结构摘要
    var summary = {};
    for (var k of keys) {
      summary[k] = typeof pageProps[k];
    }
    return { keys: summary, rawKeys: keys };
  });
  
  console.log('收藏夹列表:', JSON.stringify(result, null, 2));
  
  await browser.disconnect();
}

check().catch(err => console.error('错误:', err.message));
