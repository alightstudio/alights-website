import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const pages = await browser.pages();
const page = pages[0];

await page.goto('https://www.xinpianchang.com/bookmark/2124196?from=userBookmark', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
await new Promise(r => setTimeout(r, 15000)); // Wait 15s for possible redirect

// Check if security page or actual content
const info = await page.evaluate(() => {
  var title = document.title;
  var nd = window.__NEXT_DATA__;
  var body = document.body ? document.body.innerText.substring(0, 1000) : '';
  return { title, hasNextData: !!nd, body };
});
console.log('标题:', info.title);
console.log('Has __NEXT_DATA__:', info.hasNextData);
console.log('Body:\n', info.body.substring(0, 500));

// Try to close any modal/popup
const hasCloseBtn = await page.evaluate(() => {
  var btns = document.querySelectorAll('button, [role="button"]');
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].textContent.trim() === 'Close' || btns[i].getAttribute('aria-label') === 'Close') {
      btns[i].click();
      return true;
    }
  }
  return false;
});
console.log('关闭弹窗:', hasCloseBtn);
if (hasCloseBtn) await new Promise(r => setTimeout(r, 2000));

// Check again
const info2 = await page.evaluate(() => {
  var nd = window.__NEXT_DATA__;
  var title = document.title;
  return { title, hasNextData: !!nd };
});
console.log('关闭后:', JSON.stringify(info2));

await browser.disconnect();
