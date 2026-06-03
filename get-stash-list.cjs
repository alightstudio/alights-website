const puppeteer = require('puppeteer-core');

async function check() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:49209',
    defaultViewport: null
  });
  const pages = await browser.pages();
  const page = pages[0];
  
  // 提取收藏夹列表数据
  const result = await page.evaluate(() => {
    var data = window.__NEXT_DATA__;
    if (!data || !data.props || !data.props.pageProps) return { error: 'no data' };
    
    var pp = data.props.pageProps;
    
    // 尝试 bookmarks 路径
    if (pp.bookmarks && pp.bookmarks.list) {
      return pp.bookmarks.list.map(b => ({
        id: b.id,
        name: b.name,
        count: b.count || 0
      }));
    }
    
    // 返回原始结构用于调试
    var keys = Object.keys(pp);
    var summary = {};
    for (var k of keys) {
      var v = pp[k];
      if (v && typeof v === 'object') {
        summary[k] = Object.keys(v);
      } else {
        summary[k] = typeof v;
      }
    }
    return { keys: summary };
  });
  
  console.log(JSON.stringify(result, null, 2));
  await browser.disconnect();
}

check().catch(err => console.error('错误:', err.message));
