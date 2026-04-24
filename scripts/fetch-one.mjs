import { chromium } from 'playwright';

const browser = await chromium.launch({ 
  headless: true,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
});

const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'zh-CN',
  viewport: { width: 1920, height: 1080 },
});
const page = await context.newPage();

try {
  const url = 'https://www.xinpianchang.com/bookmark/2099178';
  console.error('Fetching:', url);
  
  // Try with networkidle for longer wait
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  console.error('Page loaded, URL:', page.url());
  
  const content = await page.content();
  console.error('HTML length:', content.length);
  
  // Check for NEXT_DATA
  const match = content.match(/__NEXT_DATA__[^>]*>(.*?)<\/script>/s);
  if (match) {
    console.error('__NEXT_DATA__ found!');
    console.log(match[1]);
  } else {
    // Look for any JSON data
    console.error('No __NEXT_DATA__, checking page content...');
    console.log(content.substring(0, 3000));
  }
} catch(e) {
  console.error('ERROR:', e.message);
  console.error('Stack:', e.stack?.split('\n').slice(0, 3).join('\n'));
}

await browser.close();
