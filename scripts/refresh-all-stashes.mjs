// 通过 xinpianchang API 批量刷新所有 stash + portfolio 指标数据 (v2 - 批量内联)
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('src/data');
const CDP_URL = 'http://127.0.0.1:9222';
const log = msg => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
const BATCH_SIZE = 20;

async function batchFetch(page, ids) {
  // Single page.evaluate with all fetches batched
  return await page.evaluate(async (idList) => {
    const results = [];
    for (let i = 0; i < idList.length; i++) {
      try {
        const r = await fetch('/api/xpc/v2/article/' + idList[i]);
        if (!r.ok) { results.push(null); continue; }
        const d = await r.json();
        if (d.status !== 0 || !d.data || !d.data.count) { results.push(null); continue; }
        const c = d.data.count;
        results.push({
          count_view: c.count_view || 0,
          count_like: c.count_like || 0,
          count_collect: c.count_collect || 0,
          count_score: c.score || 0,
        });
      } catch (e) {
        results.push(null);
      }
    }
    return results;
  }, ids);
}

async function refreshFile(page, filePath, label) {
  if (!fs.existsSync(filePath)) { log(`  ${label}: 跳过`); return { ok: 0, fail: 0, updated: 0 }; }
  
  const items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (items.length === 0) { log(`  ${label}: 空`); return { ok: 0, fail: 0, updated: 0 }; }
  
  let ok = 0, fail = 0, updated = 0;
  const allIds = items.map(i => i.id);
  
  for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
    const batchIds = allIds.slice(i, i + BATCH_SIZE);
    const results = await batchFetch(page, batchIds);
    
    for (let j = 0; j < batchIds.length; j++) {
      const metrics = results[j];
      const item = items[i + j];
      if (metrics) {
        const oldScore = item.count_score || 0;
        item.count_view = metrics.count_view;
        item.count_like = metrics.count_like;
        item.count_collect = metrics.count_collect;
        item.count_score = metrics.count_score;
        if (metrics.count_score !== oldScore) updated++;
        ok++;
      } else {
        fail++;
      }
    }
    
    log(`    ${Math.min(i + BATCH_SIZE, allIds.length)}/${allIds.length} ok=${ok} fail=${fail} changed=${updated}`);
    
    if (i + BATCH_SIZE < allIds.length) await new Promise(r => setTimeout(r, 300));
  }
  
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
  return { ok, fail, updated };
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  await page.goto('https://www.xinpianchang.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => /^stash\d+\.json$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
  
  log(`刷新 ${files.length} 个 stash + portfolio\n`);
  
  let totalOk = 0, totalFail = 0, totalUpdated = 0;
  
  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi];
    const label = file.replace('.json', '');
    log(`[${fi + 1}/${files.length}] ${label}`);
    const r = await refreshFile(page, path.join(DATA_DIR, file), label);
    totalOk += r.ok; totalFail += r.fail; totalUpdated += r.updated;
  }
  
  // Portfolio
  const pfPath = path.join(DATA_DIR, 'xpc-works.json');
  if (fs.existsSync(pfPath)) {
    log(`[Portfolio] xpc-works.json`);
    const r = await refreshFile(page, pfPath, 'xpc-works');
    totalOk += r.ok; totalFail += r.fail; totalUpdated += r.updated;
  }
  
  const total = totalOk + totalFail;
  log(`\n======== 完成 ========`);
  log(`总计: ${total} | 成功: ${totalOk} (${(totalOk/total*100).toFixed(1)}%) | 失败: ${totalFail} | 数据变化: ${totalUpdated}`);
  
  await browser.disconnect();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
