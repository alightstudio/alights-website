const puppeteer = require('puppeteer-core');

async function main() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });
  console.log('Connected!');

  const page = await browser.newPage();
  await page.goto('https://www.xinpianchang.com/bookmark/2101287', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));

  // Get first item structure
  const info = await page.evaluate(() => {
    const nd = document.getElementById('__NEXT_DATA__');
    const data = JSON.parse(nd.textContent);
    const detail = data.props.pageProps.detail;
    const list = detail.list || [];
    const nextPage = detail.next_page_url;
    
    // Sample first 2 items with full keys
    const samples = list.slice(0, 2).map(item => ({
      keys: Object.keys(item),
      item: item
    }));
    
    return { total: list.length, nextPage, samples };
  });
  
  console.log(JSON.stringify(info, null, 2));
  await page.close();
  await browser.disconnect();
}

main().catch(console.error);
