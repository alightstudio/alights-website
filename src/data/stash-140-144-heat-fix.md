# Stash 140-144 热度数据修复

## 问题
创意灵感 Gallery 页面中 Stash 140-144 的所有热度数据（播放量、点赞、收藏）显示为 0。

## 根因分析

### 1. 数据路径错误（根本原因）
原有抓取脚本从以下**错误的数据路径**提取数据：
```
pageProps.videoList[]  // ❌ 不存在，导致所有字段为 0
```
正确的数据路径在 `__NEXT_DATA__` 中嵌套更深：
```
pageProps.detail.list[i].item.count.count_view  // ✅
pageProps.detail.list[i].item.count.count_like   // ✅
pageProps.detail.list[i].item.count.count_collect // ✅
```

### 2. 数据嵌套层级
新片场收藏夹页面的真实 JSON 结构：
```
document.getElementById('__NEXT_DATA__').textContent
  → props.pageProps.detail.list[]  ← 收藏夹条目数组
    → .item.count.count_view       ← 播放量
    → .item.count.count_like       ← 点赞
    → .item.count.count_collect    ← 收藏
    → .item.author.userinfo.username  ← 作者
    → .item.categories[].category_name ← 分类
```

原脚本误用 `videoList`，这个字段在 `pageProps` 中根本不存在。

### 3. Shell 转义问题（次要）
当通过 Node.js `spawnSync` 调用 `xb eval` 时，JS 代码中的特殊字符（如 `||{}`）会被 shell 转义破坏。最终改用以下方式解决：
- 直接在 zsh 中用 `node "$XB" run --browser chrome -- eval "JS_CODE"` 
- JS 中用 `var` + `for` 循环替代箭头函数 + forEach
- 用 `python3 -c` 接收 stdout JSON 管道处理

## 修复结果

| Stash | 作品数 | 总播放量 | 最高播放 | 热度最热作品 |
|-------|--------|---------|---------|-------------|
| 140   | 38     | 21,847  | 1,200   | Dream Cream |
| 141   | 44     | 41,253  | 2,493   | Toca Me Opening Titles 2 |
| 142   | 40     | 54,100  | 3,044   | Wombstories |
| 143   | 40     | 57,757  | 3,115   | Unloading |
| 144   | 31     | 56,735  | 26,527  | The Arctic Fox |
| **合计** | **193** | **231,692** | - | |

**所有 193 个作品的热度数据均已正确填充。**

## Gallery 热度逻辑
Gallery 页面已有的热度计算公式（位于 `src/app/gallery/page.tsx`）：
```
heat = count_view + count_like × 5 + count_collect × 10
```
支持按「热度」和「播放量」两种模式排序，数据修复后会自动显示正确的排列。

## 预防措施
1. 提取脚本已更新为 `rescrape_stash.py`，使用正确的数据路径
2. 如果未来需要重新抓取，直接运行 `rescrape_stash.py` 即可
3. 验证方法：任意作品应有 `count_view > 0` 而非 0
