# WikiArt API 集成指南

## 目标
自动从 WikiArt 获取公共领域名画，生成 24×24 像素数据，扩展画库。

---

## 步骤 1: 获取 API Key

1. 访问 https://www.wikiart.org/en/App/SignUp
2. 注册账号并申请 API Key
3. 免费版限制：
   - 每天 100 次请求
   - 需要署名 "Powered by WikiArt.org"
4. 付费版：$20/月，更高限额

**替代方案（免费）：**
- 使用 Google Arts & Culture API（需要 Google Cloud 项目）
- 手动精选 + 半自动处理（推荐）

---

## 步骤 2: API 端点

### 搜索公共领域作品
```
GET https://www.wikiart.org/en/api/2/App/Search/NewSearch
Headers:
  Authorization: Bearer YOUR_API_KEY
Body:
  {
    "term": "starry night",
    "filters": {
      "time": [1300, 1900],  // 1300-1900 年的作品（公共领域）
      "classification": ["Painting"]
    }
  }
```

### 获取画作详情
```
GET https://www.wikiart.org/en/api/2/App/Painting/{paintingSlug}
Headers:
  Authorization: Bearer YOUR_API_KEY
```

返回包含：
- `image` - 原图 URL
- `title`, `artist`, `year`
- `styles`, `genres`

---

## 步骤 3: 图片处理流程

### 3.1 下载图片
```typescript
async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url)
  return Buffer.from(await res.arrayBuffer())
}
```

### 3.2 缩放到 24×24
使用 Canvas 或 Sharp 库：
```typescript
import sharp from 'sharp'

async function resizeTo24x24(imageBuffer: Buffer): Promise<string[][]> {
  const resized = await sharp(imageBuffer)
    .resize(24, 24, { fit: 'fill' })
    .raw()
    .toBuffer()
  
  const pixels: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      const idx = (y * 24 + x) * 3
      const r = resized[idx]
      const g = resized[idx + 1]
      const b = resized[idx + 2]
      row.push(`#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`)
    }
    pixels.push(row)
  }
  return pixels
}
```

### 3.3 生成 pixelData
```typescript
const pixelData = await resizeTo24x24(imageBuffer)
```

---

## 步骤 4: 批量导入脚本

创建 `scripts/import-wikiart.ts`：

```typescript
import { PrismaClient } from '@prisma/client'
import { downloadImage, resizeTo24x24 } from './image-utils'

const prisma = new PrismaClient()
const API_KEY = process.env.WIKIART_API_KEY

// 预先选定的 50 幅公共领域名画
const TARGET_PAINTINGS = [
  { slug: 'vincent-van-gogh/starry-night', title: '星月夜', artist: '梵高' },
  { slug: 'claude-monet/water-lilies', title: '睡莲', artist: '莫奈' },
  // ... 其他 48 幅
]

async function importPainting(p: typeof TARGET_PAINTINGS[0]) {
  // 1. 获取详情
  const detail = await fetch(`https://www.wikiart.org/en/api/2/App/Painting/${p.slug}`, {
    headers: { Authorization: `Bearer ${API_KEY}` }
  }).then(r => r.json())
  
  // 2. 下载图片
  const imgBuffer = await downloadImage(detail.image)
  
  // 3. 缩放 + 提取颜色
  const pixelData = await resizeTo24x24(imgBuffer)
  
  // 4. 保存到数据库或生成代码
  console.log(`import { generate${p.title.replace(/\s+/g, '')} } from ...`)
}

async function main() {
  for (const p of TARGET_PAINTINGS) {
    await importPainting(p)
    await new Promise(r => setTimeout(r, 1000)) // 避免 API 限速
  }
}

main()
```

---

## 步骤 5: 简化方案（推荐）

由于 WikiArt API 限制和复杂度，推荐**半自动方案**：

### 5.1 手动精选画作列表
创建 `scripts/paintings-list.json`：
```json
[
  { "title": "星月夜", "artist": "梵高", "year": "1889", "imageUrl": "https://upload.wikimedia.org/..." },
  { "title": "蒙娜丽莎", "artist": "达芬奇", "year": "1503", "imageUrl": "https://upload.wikimedia.org/..." }
]
```

### 5.2 运行本地脚本生成像素数据
```bash
npm run import-paintings
```

脚本会：
1. 下载图片
2. 缩放到 24×24
3. 输出 `famous-paintings.ts` 代码片段
4. 手动复制到 `src/lib/famous-paintings.ts`

---

## 当前状态

❌ WikiArt API 尚未接入（需要 API Key）
✅ 已扩展 20 幅名画（手动精选）
⏳ 待完成：批量导入脚本

---

## 下一步（用户确认后）

1. **注册 WikiArt API** 或选择替代方案
2. **手动精选 50 幅公共领域名画**（Wikimedia Commons 链接）
3. **运行导入脚本**生成像素数据
4. **更新 FAMOUS_PAINTINGS 数组**（20 → 50+ 幅）
5. **部署更新**

---

## 技术挑战

| 挑战 | 解决方案 |
|------|----------|
| WikiArt API 限速 | 分批导入，每天 100 幅 |
| 图片版权 | 仅使用 1900 年前作品（公共领域） |
| 颜色量化 | 使用 Sharp 直接缩放，保留原始色彩 |
| 24×24 识别度 | 手动筛选，确保缩小后仍能识别 |

---

## 推荐画作列表（50 幅公共领域）

### 文艺复兴（1300-1600）
1. 蒙娜丽莎 - 达芬奇
2. 最后的晚餐 - 达芬奇
3. 维纳斯的诞生 - 波提切利
4. 西斯廷天顶画 - 米开朗基罗
5. 宫娥 - 委拉斯开兹
6. 夜巡 - 伦勃朗
7. 戴珍珠耳环的少女 - 维米尔

### 印象派（1860-1900）
8. 睡莲 - 莫奈
9. 向日葵 - 梵高
10. 星月夜 - 梵高
11. 咖啡馆露台 - 梵高
12. 干草堆 - 莫奈
13. 日出印象 - 莫奈

### 后印象派（1880-1920）
14. 大碗岛的星期天下午 - 修拉
15. 红色葡萄园 - 梵高
16. 塔希提岛的风光 - 高更

### 现代艺术（1900-1950）
17. 记忆的永恒 - 达利
18. 格尔尼卡 - 毕加索
19. 吻 - 克里姆特
20. 构成第七号 - 康定斯基
21. 呐喊 - 蒙克
22. 红气球 - 保罗·克利

### 东方艺术
23. 神奈川冲浪里 - 葛饰北斋
24. 富岳三十六景 - 葛饰北斋
25. 鸟兽人物戏画 - 鸟羽僧正

（完整列表见 `scripts/target-paintings.json`）
