import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const pages = await browser.pages();
// Try to use the last active page or create new
let page = pages[pages.length - 1];
if (!page) page = await browser.newPage();

// Navigate with long timeout
try {
  await page.goto('https://www.xinpianchang.com/bookmark/2124196?from=userBookmark', { waitUntil: 'networkidle2', timeout: 30000 });
} catch(e) {
  console.log('导航超时/错误:', e.message);
}

console.log('当前URL:', await page.url());
console.log('页面标题:', await page.title());

// Wait extra time
await new Promise(r => setTimeout(r, 8000));

// Check what's available
const info = await page.evaluate(() => {
  var nd = window.__NEXT_DATA__;
  var bodyText = document.body ? document.body.innerText.substring(0, 500) : '';
  return {
    hasNextData: !!nd,
    hasProps: nd && !!nd.props,
    bodyPreview: bodyText,
    pageContent: document.querySelector('.bookmark-detail, .stash-detail, main') ? 'has content' : 'no main content'
  };
});
console.log('页面信息:', JSON.stringify(info, null, 2));

// If still no data, retry with reload
if (!info.hasNextData) {
  console.log('\n重试: 刷新页面...');
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 8000));
  const info2 = await page.evaluate(() => {
    var nd = window.__NEXT_DATA__;
    return { hasNextData: !!nd, hasProps: nd && !!nd.props };
  });
  console.log('刷新后:', JSON.stringify(info2));
}

await browser.disconnect();
