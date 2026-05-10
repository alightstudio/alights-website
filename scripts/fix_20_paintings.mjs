/**
 * Fix 20 broken painting thumbnails
 * Strategy: Use Wikimedia Commons API + Wikipedia for reliable image sources
 * Fallback: Direct known URLs from museum/encyclopedia sites
 */
import { spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const OUT = '/tmp/paintings_80_fix';
mkdirSync(OUT, { recursive: true });

// 20 problematic paintings with their Wikimedia Commons file names or search terms
const PROBLEMS = [
  ["guernica", "格尔尼卡", "Picasso Guernica"],
  ["the-last-supper", "最后的晚餐", "Leonardo Last Supper"],
  ["sleeping-gypsy", "沉睡的吉普赛人", "Rousseau Sleeping Gypsy"],
  ["the-ghent-altarpiece", "根特祭坛画", "Eyck Ghent Altarpiece"],
  ["the-ambassadors", "大使们", "Holbein The Ambassadors"],
  ["the-swing", "秋千", "Fragonard The Swing"],
  ["the-hay-wain", "干草车", "Constable The Hay Wain"],
  ["mr-and-mrs-andrews", "安德鲁斯夫妇", "Gainsborough Mr and Mrs Andrews"],
  ["the-transfiguration", "基督变容", "Raphael Transfiguration"],
  ["oath-of-horatii", "贺拉斯兄弟之誓", "David Oath of the Horatii"],
  ["belshazzar-feast", "伯沙撒的盛宴", "Rembrandt Belshazzar's Feast"],
  ["woman-holding-balance", "持天平的女人", "Vermeer Woman Holding Balance"],
  ["the-lacemaker", "织花边的女子", "Vermeer The Lacemaker"],
  ["venus-of-urbino", "乌尔比诺的维纳斯", "Titian Venus of Urbino"],
  ["assumption-of-virgin", "圣母升天", "Titian Assumption of the Virgin"],
  ["mount-sainte-victoire", "圣维克多山", "Cézanne Mont Sainte-Victoire"],
  ["dance-matisse", "舞蹈", "Matisse The Dance"],
  ["woman-with-hat", "戴帽子的女人", "Matisse Woman with a Hat"],
  ["demoiselles-davignon", "亚威农少女", "Picasso Les Demoiselles d'Avignon"],
  ["marilyn-diptych", "玛丽莲双联画", "Warhol Marilyn Diptych"],
];

/**
 * Search Wikimedia Commons for an image URL
 */
async function searchWikimedia(query) {
  try {
    // Wikimedia Commons API - search for images
    const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=3&format=json&origin=*`;
    const resp = await fetch(url);
    const data = await resp.json();
    const results = data.query?.search || [];
    
    for (const r of results) {
      const title = r.title;
      if (!title.startsWith('File:')) continue;
      
      // Get image info (thumbnail URL)
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size&iiurlwidth=400&format=json&origin=*`;
      const infoResp = await fetch(infoUrl);
      const infoData = await infoResp.json();
      const pages = infoData.query?.pages || {};
      const page = Object.values(pages)[0];
      const imgInfo = page?.imageinfo?.[0];
      
      if (imgInfo?.thumburl) {
        console.log(`  [WM] Found: ${title} → ${imgInfo.thumburl}`);
        return imgInfo.thumburl; // thumbnail, usually 400px
      }
      if (imgInfo?.url) {
        console.log(`  [WM] Full: ${title} → ${imgInfo.url}`);
        return imgInfo.url; // full size
      }
    }
    console.log(`  [WM] No results for: ${query}`);
    return null;
  } catch (e) {
    console.log(`  [WM] Error: ${e.message}`);
    return null;
  }
}

/**
 * Search Wikipedia for the main image of an article
 */
async function searchWikipediaImage(query) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
    const resp = await fetch(url);
    const data = await resp.json();
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];
    const thumb = page?.thumbnail?.source;
    if (thumb) {
      console.log(`  [WP] Found: ${thumb}`);
      return thumb;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Download image to file
 */
async function download(url, filepath) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Art Archive Project)' },
      redirect: 'follow',
      timeout: 15000,
    });
    if (!resp.ok) return false;
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 1000) return false; // too small, probably error page
    writeFileSync(filepath, buf);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Process downloaded image to 80x80 pixel data using Python/Pillow
 */
function processToPixels(filepath) {
  const pyCode = `
from PIL import Image
import sys
try:
    img = Image.open('${filepath}').convert('RGB')
except:
    print('ERROR_OPEN')
    sys.exit(1)
w, h = img.size
min_side = min(w, h)
left = (w - min_side) // 2
top = (h - min_side) // 2
img = img.crop((left, top, left + min_side, top + min_side))
img = img.resize((80, 80), Image.LANCZOS)
px = img.load()
colors = set()
rows = []
for y in range(80):
    row = []
    for x in range(80):
        r, g, b = px[x, y]
        colors.add((r,g,b))
        row.append(f"#{r:02x}{g:02x}{b:02x}")
    rows.append('|'.join(row))
print('__ROWS__')
for r in rows:
    print(r)
print(f"__COLORS__{len(colors)}")
`;
  const p = spawnSync('python3', ['-c', pyCode], { timeout: 30000 });
  if (p.error || p.status !== 0) {
    return { error: 'process fail', stderr: p.stderr?.toString().trim().slice(0, 200) };
  }
  const out = p.stdout.toString('utf-8').trim();
  if (out.includes('ERROR_OPEN')) return { error: 'cannot open image' };
  
  const lines = out.split('\n');
  // Find __ROWS__ marker
  const rowStartIdx = lines.indexOf('__ROWS__');
  if (rowStartIdx === -1) return { error: 'no rows marker' };
  
  const rows = [];
  let colorCount = 0;
  for (let i = rowStartIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('__COLORS__')) {
      colorCount = parseInt(line.split('__')[2]) || 0;
      break;
    }
    rows.push(line);
  }
  
  if (rows.length !== 80) return { error: `expected 80 rows, got ${rows.length}` };
  return { rows, colorCount };
}

// Main
const results = [];
const failed = [];

for (const [pid, title, wmQuery] of PROBLEMS) {
  const filepath = `${OUT}/${pid}.jpg`;
  console.log(`\n[${PROBLEMS.indexOf([pid, title, wmQuery]) + 1}/20] ${pid} (${title})`);
  
  let imgUrl = await searchWikimedia(wmQuery);
  
  // Fallback: Wikipedia article image
  if (!imgUrl) {
    imgUrl = await searchWikipediaImage(wmQuery);
  }
  
  // Fallback: Baidu with 油画 suffix
  if (!imgUrl) {
    console.log(`  Trying Baidu fallback...`);
    try {
      const baiduResp = await fetch(`https://image.baidu.com/search/acjson?word=${encodeURIComponent(title + ' 油画 高清')}&pn=0&rn=3&tn=resultjson_com`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        timeout: 10000,
      });
      const baiduData = await baiduResp.json();
      const baiduImg = baiduData.data?.[0]?.thumbURL || baiduData.data?.[0]?.objURL;
      if (baiduImg) {
        // objURL is encoded
        const decoded = baiduImg.startsWith('ippr_z2C$qAzdH3FAzdH3F') 
          ? decodeURIComponent(baiduImg.replace(/_z2C/g,'/').replace(/_z&e3B/g,'~').replace(/_AzdH3F/g,''))
          : baiduImg;
        imgUrl = decoded;
        console.log(`  [BD] Using: ${imgUrl.slice(0, 80)}...`);
      }
    } catch (e) {
      console.log(`  [BD] Error: ${e.message}`);
    }
  }
  
  if (!imgUrl) {
    console.log(`  ✗ No image source found`);
    failed.push(pid);
    continue;
  }
  
  // Download
  if (!(await download(imgUrl, filepath))) {
    console.log(`  ✗ Download failed`);
    failed.push(pid);
    continue;
  }
  
  // Process
  const result = processToPixels(filepath);
  if (result.error) {
    console.log(`  ✗ Process failed: ${result.error}`);
    failed.push(pid);
    continue;
  }
  
  results.push({ pid, rows: result.rows, colorCount: result.colorCount });
  console.log(`  ✓ OK — ${result.colorCount} colors`);
}

// Output summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Fixed: ${results.length}/20 | Failed: ${failed.length}`);
if (failed.length) console.log(`Failed: ${failed.join(', ')}`);

// Write individual TS files for each fixed painting
for (const r of results) {
  const vn = r.pid.replace(/-/g, '_');
  const tsLines = [`const ${vn}Data: string[][] = [`];
  for (const row of r.rows) {
    tsLines.push(`  [${row.split('|').map(c => `'${c}'`).join(',')}],`);
  }
  tsLines.push(']');
  writeFileSync(`${OUT}/${vn}.ts`, tsLines.join('\n'));
}
console.log(`\nIndividual TS files written to ${OUT}/`);

// Also write a combined JSON with all pixel data for easy inspection
const allData = {};
for (const r of results) {
  allData[r.pid] = { rows: r.rows, colorCount: r.colorCount };
}
writeFileSync(`${OUT}/fixed_paintings.json`, JSON.stringify(allData));
console.log('Combined data written to fixed_paintings.json');
