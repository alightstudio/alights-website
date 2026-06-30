// Find stash 99 - click "加载更多" then extract
import puppeteer from 'puppeteer-core';

const browserURL = 'http://127.0.0.1:9222';

async function main() {
  const browser = await puppeteer.connect({ browserURL });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('bookmark')) || pages[0];

  // Check if stash 99 is already visible
  let found = await page.evaluate(function() {
    var links = document.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      if (links[i].textContent.trim() === 'Stash 99') {
        var m = links[i].href.match(/\/bookmark\/(\d+)/);
        return m ? m[1] : null;
      }
    }
    return null;
  });

  if (found) {
    console.log('stash 99 ID:', found);
    return found;
  }

  // Click "加载更多" multiple times
  for (var attempt = 0; attempt < 5; attempt++) {
    var clicked = await page.evaluate(function() {
      var btns = document.querySelectorAll('button');
      for (var k = 0; k < btns.length; k++) {
        if (btns[k].textContent.trim() === '加载更多') {
          btns[k].click();
          return true;
        }
      }
      return false;
    });

    if (!clicked) {
      console.log('No more "加载更多" button');
      break;
    }

    console.log('Clicked 加载更多, waiting...');
    await new Promise(function(r) { setTimeout(r, 5000); });

    found = await page.evaluate(function() {
      var links = document.querySelectorAll('a');
      for (var i = 0; i < links.length; i++) {
        if (links[i].textContent.trim() === 'Stash 99') {
          var m = links[i].href.match(/\/bookmark\/(\d+)/);
          return m ? m[1] : null;
        }
      }
      return null;
    });

    if (found) {
      console.log('Found stash 99 ID:', found);
      break;
    }
  }

  if (!found) {
    console.log('❌ Could not find stash 99');
  }

  await browser.disconnect();
}

main().catch(function(e) { console.error(e); process.exit(1); });
