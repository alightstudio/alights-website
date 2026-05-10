/**
 * Batch process paintings: search Baidu, download, extract 80x80 pixels
 * Uses node fetch (bypasses Baidu anti-crawl).
 * Key fix: use encodeURIComponent directly (no double-encoding!)
 */
import { spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import path from 'path';

const OUT = '/tmp/paintings_80';
mkdirSync(OUT, { recursive: true });

const PAINTINGS = [
  ["american-gothic","美国哥特式","格兰特·伍德","1930"],
  ["composition-vii","构成第七号","康定斯基","1913"],
  ["girl-with-pearl-earring","戴珍珠耳环的少女","维米尔","1665"],
  ["great-wave","神奈川冲浪里","葛饰北斋","1831"],
  ["guernica","格尔尼卡","毕加索","1937"],
  ["las-meninas","宫娥","委拉斯开兹","1656"],
  ["mona-lisa","蒙娜丽莎","达芬奇","1503"],
  ["red-balloon","红气球","保罗·克利","1922"],
  ["starry-night","星月夜","梵高","1889"],
  ["sunflowers","向日葵","梵高","1888"],
  ["the-birth-of-venus","维纳斯的诞生","波提切利","1485"],
  ["the-garden-of-earthly-delights","人间乐园","博斯","1500"],
  ["the-kiss","吻","克里姆特","1908"],
  ["the-last-supper","最后的晚餐","达芬奇","1498"],
  ["the-night-watch","夜巡","伦勃朗","1642"],
  ["the-persistence-of-memory","记忆的永恒","达利","1931"],
  ["the-scream","呐喊","蒙克","1893"],
  ["the-sistine-chapel-ceiling","西斯廷天顶画","米开朗基罗","1512"],
  ["the-thinker","思想者","罗丹","1904"],
  ["water-lilies","睡莲","莫奈","1906"],
  ["iris","鸢尾花","梵高","1889"],
  ["liberty","自由引导人民","德拉克罗瓦","1830"],
  ["night-cafe","夜间咖啡馆","梵高","1888"],
  ["cafe-terrace","夜间的露天咖啡座","梵高","1888"],
  ["sleeping-gypsy","沉睡的吉普赛人","卢梭","1897"],
  ["olympia","奥林匹亚","马奈","1863"],
  ["saturday-afternoon","大碗岛的星期天下午","修拉","1884"],
  ["saturn-devouring","农神食子","戈雅","1823"],
  ["third-of-may","1808年5月3日","戈雅","1814"],
  ["school-of-athens","雅典学院","拉斐尔","1510"],
  ["the-creation-of-adam","创造亚当","米开朗基罗","1512"],
  ["the-calling-of-saint-matthew","圣马太蒙召","卡拉瓦乔","1600"],
  ["the-milkmaid","倒牛奶的女仆","维米尔","1658"],
  ["view-of-delft","代尔夫特风景","维米尔","1661"],
  ["the-arnolfini-portrait","阿尔诺芬尼夫妇像","扬·凡·艾克","1434"],
  ["the-ghent-altarpiece","根特祭坛画","扬·凡·艾克","1432"],
  ["the-ambassadors","大使们","小汉斯·霍尔拜因","1533"],
  ["hunters-in-the-snow","雪中猎人","勃鲁盖尔","1565"],
  ["the-tower-of-babel","巴别塔","勃鲁盖尔","1563"],
  ["the-harvesters","收割者","勃鲁盖尔","1565"],
  ["the-fall-of-icarus","伊卡洛斯的坠落","勃鲁盖尔","1558"],
  ["self-portrait-van-gogh","梵高自画像","梵高","1889"],
  ["almond-blossoms","杏花","梵高","1890"],
  ["wheatfield-with-crows","麦田上的乌鸦","梵高","1890"],
  ["bedroom-in-arles","阿尔勒的卧室","梵高","1888"],
  ["the-potato-eaters","吃土豆的人","梵高","1885"],
  ["portrait-of-dr-gachet","加歇医生像","梵高","1890"],
  ["van-gogh-chair","梵高的椅子","梵高","1888"],
  ["impression-sunrise","日出印象","莫奈","1872"],
  ["woman-with-parasol","撑阳伞的女人","莫奈","1875"],
  ["japanese-bridge","日本桥","莫奈","1899"],
  ["haystacks","干草堆","莫奈","1890"],
  ["rouen-cathedral","鲁昂大教堂","莫奈","1894"],
  ["dance-at-le-moulin","煎饼磨坊的舞会","雷诺阿","1876"],
  ["luncheon-of-boating-party","船上的午宴","雷诺阿","1881"],
  ["the-swing","秋千","雷诺阿","1876"],
  ["the-large-bathers","大浴女","雷诺阿","1887"],
  ["whistlers-mother","惠斯勒的母亲","惠斯勒","1871"],
  ["the-fighting-temeraire","被拖去解体的战舰","透纳","1839"],
  ["rain-steam-speed","雨蒸汽速度","透纳","1844"],
  ["the-hay-wain","干草车","康斯太勃尔","1821"],
  ["dedham-vale","德汉峡谷","康斯太勃尔","1802"],
  ["the-blue-boy","蓝衣少年","庚斯博罗","1770"],
  ["mr-and-mrs-andrews","安德鲁斯夫妇","庚斯博罗","1750"],
  ["the-sistine-madonna","西斯廷圣母","拉斐尔","1512"],
  ["the-transfiguration","基督变容","拉斐尔","1520"],
  ["judith-holofernes","朱迪斯斩杀赫罗弗尼斯","卡拉瓦乔","1600"],
  ["the-entombment","基督下葬","卡拉瓦乔","1603"],
  ["the-death-of-marat","马拉之死","雅克-路易·大卫","1793"],
  ["napoleon-crossing-alps","拿破仑穿越阿尔卑斯山","雅克-路易·大卫","1801"],
  ["oath-of-horatii","贺拉斯兄弟之誓","雅克-路易·大卫","1784"],
  ["the-return-of-prodigal-son","浪子回头","伦勃朗","1669"],
  ["the-jewish-bride","犹太新娘","伦勃朗","1667"],
  ["anatomy-lesson","杜尔普医生的解剖课","伦勃朗","1632"],
  ["belshazzar-feast","伯沙撒的盛宴","伦勃朗","1635"],
  ["woman-holding-balance","持天平的女人","维米尔","1664"],
  ["the-geographer","地理学家","维米尔","1669"],
  ["the-astronomer","天文学家","维米尔","1668"],
  ["girl-reading-letter","读信的蓝衣女子","维米尔","1663"],
  ["the-art-of-painting","绘画艺术","维米尔","1666"],
  ["the-lacemaker","织花边的女子","维米尔","1670"],
  ["the-three-graces","美惠三女神","鲁本斯","1635"],
  ["the-garden-of-love","爱之园","鲁本斯","1633"],
  ["the-rape-of-europa","劫夺欧罗巴","提香","1562"],
  ["venus-of-urbino","乌尔比诺的维纳斯","提香","1538"],
  ["bacchus-and-ariadne","巴库斯与阿里阿德涅","提香","1523"],
  ["assumption-of-virgin","圣母升天","提香","1518"],
  ["the-surrender-breda","布雷达的投降","委拉斯开兹","1635"],
  ["still-life-apples","苹果与橘子","塞尚","1899"],
  ["the-card-players","玩纸牌的人","塞尚","1893"],
  ["mount-sainte-victoire","圣维克多山","塞尚","1904"],
  ["dance-matisse","舞蹈","马蒂斯","1910"],
  ["the-red-studio","红色画室","马蒂斯","1911"],
  ["woman-with-hat","戴帽子的女人","马蒂斯","1905"],
  ["demoiselles-davignon","亚威农少女","毕加索","1907"],
  ["the-old-guitarist","老吉他手","毕加索","1903"],
  ["three-musicians","三个音乐家","毕加索","1921"],
  ["weeping-woman","哭泣的女人","毕加索","1937"],
  ["the-dream","梦","毕加索","1932"],
  ["nighthawks","夜鹰","爱德华·霍珀","1942"],
  ["christinas-world","克里斯蒂娜的世界","安德鲁·怀斯","1948"],
  ["campbells-soup","金宝汤罐头","安迪·沃霍尔","1962"],
  ["marilyn-diptych","玛丽莲双联画","安迪·沃霍尔","1962"],
  ["yellow-red-blue","黄红蓝","康定斯基","1925"],
  ["broadway-boogie","百老汇爵士乐","蒙德里安","1943"],
  ["composition-red-blue","红黄蓝构成","蒙德里安","1930"],
  ["convergence","聚合","杰克逊·波洛克","1952"],
];

async function searchBaidu(keyword) {
  const url = `https://image.baidu.com/search/acjson?tn=resultjson_com&word=${encodeURIComponent(keyword)}&pn=0&rn=1`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json', 'Referer': 'https://image.baidu.com/' }
      });
      const data = JSON.parse(await res.text());
      for (const item of (data.data || [])) {
        const imgUrl = item.thumbURL || item.middleURL || '';
        if (imgUrl && imgUrl.length > 10 && !imgUrl.includes('.gif')) return imgUrl;
      }
    } catch (e) { /* retry */ }
  }
  return null;
}

async function download(url, filepath) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(filepath, buf);
      if (buf.length > 2000) return true;
    } catch (e) { /* retry */ }
  }
  return false;
}

async function main() {
  const results = [], failed = [];
  console.log(`=== Processing ${PAINTINGS.length} paintings ===`);

  for (let i = 0; i < PAINTINGS.length; i++) {
    const [pid, title, artist, year] = PAINTINGS[i];
    const filepath = path.join(OUT, `${pid}.jpg`);

    process.stdout.write(`[${i+1}/${PAINTINGS.length}] ${title}... `);

    // Check cache
    let haveFile = false;
    if (existsSync(filepath) && statSync(filepath).size > 2000) {
      haveFile = true;
    }

    if (!haveFile) {
      const imgUrl = await searchBaidu(title);
      if (!imgUrl) {
        // Try with 油画 appended
        const imgUrl2 = await searchBaidu(`${title} 油画`);
        if (!imgUrl2) { console.log('✗ no results'); failed.push(pid); continue; }
        if (!(await download(imgUrl2, filepath))) { console.log('✗ dl fail'); failed.push(pid); continue; }
      } else if (!(await download(imgUrl, filepath))) { console.log('✗ dl fail'); failed.push(pid); continue; }
    }

    // Process with Python/Pillow
    const pyCode = `
from PIL import Image
import sys
img = Image.open('${filepath}').convert('RGB')
w, h = img.size
min_side = min(w, h)
left = (w - min_side) // 2
top = (h - min_side) // 2
img = img.crop((left, top, left + min_side, top + min_side))
img = img.resize((80, 80), Image.LANCZOS)
px = img.load()
colors = set()
for y in range(80):
    row = []
    for x in range(80):
        r, g, b = px[x, y]
        colors.add((r,g,b))
        row.append(f"#{r:02x}{g:02x}{b:02x}")
    print('|'.join(row))
print(f"__COLORS__{len(colors)}")
`;
    const p = spawnSync('python3', ['-c', pyCode]);
    if (p.error || p.status !== 0) {
      console.log('✗ process fail:', p.stderr?.toString().trim().slice(0,100));
      failed.push(pid);
      continue;
    }

    const out = p.stdout.toString('utf-8').trim();
    const lines = out.split('\n');
    const colorLine = lines.pop();
    const nColors = colorLine?.startsWith('__COLORS__') ? parseInt(colorLine.split('__')[2]) : 0;
    
    results.push({ pid, title, artist, year, rows: lines, nColors });
    console.log(`✓ ${nColors} colors`);
  }

  console.log(`\n=== Complete: ${results.length} success, ${failed.length} failed ===`);
  if (failed.length) console.log(`Failed (${failed.length}): ${failed.slice(0,20).join(', ')}`);

  // Generate TS
  const tsLines = ['// Auto-generated: 100 famous paintings at 80×80\n'];
  for (const r of results) {
    const vn = r.pid.replace(/-/g, '_');
    tsLines.push(`// ${r.title} - ${r.artist} (${r.year}) - ${r.nColors} colors`);
    tsLines.push(`const ${vn}Data: string[][] = [`);
    for (const row of r.rows) {
      tsLines.push(`  [${row.split('|').map(c => `'${c}'`).join(',')}],`);
    }
    tsLines.push(']\n');
  }
  tsLines.push("import { PaintingTemplate } from '@/lib/famous-paintings'\n");
  tsLines.push('export const FAMOUS_PAINTINGS: PaintingTemplate[] = [');
  for (const r of results) {
    tsLines.push(`  { id: '${r.pid}', title: '${r.title}', artist: '${r.artist}', year: '${r.year}', pixelData: ${r.pid.replace(/-/g, '_')}Data },`);
  }
  tsLines.push(']');

  writeFileSync('/tmp/paintings_80/painting-pixels.ts', tsLines.join('\n'));
  const mb = (Buffer.byteLength(tsLines.join('\n'), 'utf-8') / 1024 / 1024).toFixed(1);
  console.log(`\nTS output: ${mb} MB`);
}

main().catch(e => console.error('FATAL:', e));
