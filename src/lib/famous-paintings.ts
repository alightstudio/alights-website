// 世界名画像素数据（彩色底稿）
// 每幅画包含：id, title, artist, year, pixelData (二维数组，每个元素为 hex 颜色)
// 采用 dither 算法每格自动产生丰富的色彩变化，使画面更接近真实画作

export const TEMPLATE_SIZE = 40

export interface PaintingTemplate {
  id: string
  title: string
  artist: string
  year: string
  pixelData: string[][] // TEMPLATE_SIZE rows × TEMPLATE_SIZE cols
}

type Generator = (size?: number) => string[][]

// ====== 色彩工具函数 ======

/** Hex → RGB */
function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

/** RGB → Hex */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`
}

/** 基于位置产生色彩抖动（用 x,y 做种子，产生确定性的颜色变化） */
function dither(baseHex: string, x: number, y: number, intensity: number = 20): string {
  const [r, g, b] = hexToRgb(baseHex)
  const noise = ((x * 31 + y * 53 + (x * y) * 7) % 7 - 3)
  const dr = noise * intensity / 3
  const dg = noise * intensity / 3
  const db = noise * intensity / 3
  return rgbToHex(r + dr, g + dg, b + db)
}

/** 在两色之间插值（t: 0-1） */
function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const tClamp = Math.max(0, Math.min(1, t))
  return rgbToHex(
    r1 + (r2 - r1) * tClamp,
    g1 + (g2 - g1) * tClamp,
    b1 + (b2 - b1) * tClamp,
  )
}

/** 垂直渐变 */
function vGradient(x: number, y: number, size: number, topColor: string, bottomColor: string): string {
  return lerpColor(topColor, bottomColor, y / size)
}

/** 水平渐变 */
function hGradient(x: number, y: number, size: number, leftColor: string, rightColor: string): string {
  return lerpColor(leftColor, rightColor, x / size)
}

/** 从调色板中选择一个颜色，带位置抖动 */
function pickFromPalette(palette: string[], x: number, y: number, ditherIntensity: number = 15): string {
  const idx = Math.abs((x * 7 + y * 13 + (x * y) * 3)) % palette.length
  return dither(palette[idx], x, y, ditherIntensity)
}

/** 在圆内的像素返回颜色，否则返回 undefined */
function inCircle(x: number, y: number, cx: number, cy: number, r: number): boolean {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

/** 在矩形内的像素返回颜色 */
function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh
}

/** 创建空白画布 */
function empty(bg: string, size: number): string[][] {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => dither(bg, x, y, 10))
  )
}

// ====== 各名画生成器 ======

// 星月夜 - 梵高
function generateStarryNight(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#1B2A4A', s)
  const nightSkyPalette = ['#1B2A4A','#1E3050','#23385A','#162340','#2A4068']
  const starPalette = ['#F5E642','#FFE44D','#FFF4A0','#FFD700','#E8D040']
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const t = y / s
    
    if (t >= 0.65) {
      canvas[y][x] = dither('#1A1A2E', x, y, 8) // 前景深色
    } else if (t >= 0.42) {
      canvas[y][x] = dither('#2C3E50', x, y, 12) // 山丘
    } else {
      // 夜空渐变
      canvas[y][x] = lerpColor('#1B2A4A', '#2A4068', 1 - t)
      canvas[y][x] = dither(canvas[y][x], x, y, 12)
    }
    
    // 旋涡纹理 (van Gogh style swirls)
    if (t < 0.42 && t > 0.15) {
      const swirlDist = Math.abs((x - s * 0.3) * 0.5 + (y - s * 0.25) * 0.3)
      if (swirlDist < s * 0.08) {
        canvas[y][x] = dither('#4A6FA5', x, y, 10)
      }
    }
    
    // 下弦月
    if (inCircle(x, y, Math.floor(s * 0.52), Math.floor(s * 0.18), 3)) {
      const dx = x - s * 0.52, dy = y - s * 0.18
      const dist = Math.sqrt(dx*dx + dy*dy) / 3
      canvas[y][x] = lerpColor('#FFF8DC', '#FFE4B5', dist)
    }
    
    // 星星——不同大小和亮度
    if (t < 0.4 && canvas[y][x] !== '#FFF8DC' && !inCircle(x, y, Math.floor(s * 0.52), Math.floor(s * 0.18), 3)) {
      const denom = Math.max(2, Math.floor(s * 0.35))
      if ((x * 7 + y * 13 + 3) % denom === 0) {
        canvas[y][x] = pickFromPalette(starPalette, x, y, 10)
      }
    }
  }
  return canvas
}

// 睡莲 - 莫奈 (印象派，色彩丰富柔和)
function generateWaterLilies(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#2E8B57', s)
  const waterPalette = ['#2E8B57','#3A9B67','#4AB07A','#26804F','#1E7045']
  const lilyPinkPalette = ['#FFB6C1','#FFC0CB','#FFB0B8','#FFAAB5','#F5A0B0']
  const lilyGreenPalette = ['#90EE90','#7DD17D','#98FB98','#6CC46C','#85D585']
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const t = y / s
    // 水面渐变
    canvas[y][x] = lerpColor('#2E8B57', '#4AB07A', x / s)
    canvas[y][x] = lerpColor(canvas[y][x], dither(canvas[y][x], x, y, 8), 0.5)

    // 水面倒影光斑
    if ((x * 5 + y * 3) % 7 === 0) {
      canvas[y][x] = dither('#87CEEB', x, y, 5)
    }

    // 莲花丛 1
    if (inCircle(x, y, s * 0.42, s * 0.5, s * 0.2)) {
      canvas[y][x] = pickFromPalette(lilyPinkPalette, x, y, 8)
    }
    // 莲叶 1
    if (inCircle(x, y, s * 0.48, s * 0.52, s * 0.22) && !inCircle(x, y, s * 0.42, s * 0.5, s * 0.18)) {
      canvas[y][x] = pickFromPalette(lilyGreenPalette, x, y, 10)
    }
    // 莲花丛 2
    if (inCircle(x, y, s * 0.62, s * 0.45, s * 0.18)) {
      canvas[y][x] = pickFromPalette(lilyPinkPalette, x + 3, y + 7, 8)
    }
    // 莲叶 2
    if (inCircle(x, y, s * 0.65, s * 0.48, s * 0.2) && !inCircle(x, y, s * 0.62, s * 0.45, s * 0.16)) {
      canvas[y][x] = pickFromPalette(['#7DD17D','#98FB98','#6CC46C'], x, y, 10)
    }
    // 远处莲花芽
    if (inCircle(x, y, s * 0.5, s * 0.3, s * 0.12)) {
      canvas[y][x] = dither('#90EE90', x, y, 10)
    }
    // 倒影
    if (y > s * 0.6) {
      canvas[y][x] = lerpColor(canvas[y][x], '#1E7045', (y - s * 0.6) / (s * 0.4))
    }
  }
  return canvas
}

// 神奈川冲浪里 - 葛饰北斋
function generateGreatWave(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#87CEEB', s)
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const waveY = Math.sin(x * 0.3) * (s * 0.12) + s * 0.62
    const isCrest = Math.abs(y - waveY) <= 1 // 浪花白沫
    const isWave = y > waveY + 1 // 浪身
    
    if (isCrest) {
      canvas[y][x] = dither('#FFFFFF', x, y, 5)
    } else if (isWave) {
      canvas[y][x] = dither('#1E3A5F', x, y, 12)
      // 浪花纹理
      if ((x * 7) % 11 === 0 || (y * 5) % 13 === 0) {
        canvas[y][x] = dither('#2A4A6F', x, y, 8)
      }
    } else {
      // 天空渐变
      canvas[y][x] = lerpColor('#87CEEB', '#B0D4F0', y / (waveY - 2))
      canvas[y][x] = dither(canvas[y][x], x, y, 8)
    }
    
    // 飞溅的浪花
    if (isWave && ((x + y) % 9 === 0)) {
      canvas[y][x] = dither('#B0D4F0', x, y, 5)
    }
  }
  return canvas
}

// 蒙娜丽莎 - 达芬奇
function generateMonaLisa(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#4A6741', s)
  const skinPalette = ['#DEB887','#D2A679','#D4A574','#C8956B','#E0B88A']
  const hairPalette = ['#3C2415','#2D1A0E','#4A2C1A','#583520','#221005']
  const dressPalette = ['#4A6741','#5A7751','#6A8761','#3D5735','#8A9670']
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    // 背景（树林/天空）
    if (!inRect(x, y, Math.floor(s * 0.2), Math.floor(s * 0.3), Math.floor(s * 0.6), Math.floor(s * 0.55))) {
      canvas[y][x] = vGradient(x, y, s, '#6B8B5A', '#4A6741')
      canvas[y][x] = dither(canvas[y][x], x, y, 8)
      continue
    }
    
    // 衣服
    if (y > s * 0.58) {
      canvas[y][x] = pickFromPalette(dressPalette, x, y, 10)
      continue
    }
    
    // 头发 (面部上方)
    if (y < s * 0.38) {
      if (x > s * 0.3 && x < s * 0.7) {
        canvas[y][x] = pickFromPalette(hairPalette, x, y, 10)
      } else {
        canvas[y][x] = vGradient(x, y, s, '#6B8B5A', '#4A6741')
        canvas[y][x] = dither(canvas[y][x], x, y, 8)
      }
      continue
    }
    
    // 面部（椭球）
    if (inCircle(x, y, s * 0.5, s * 0.48, s * 0.18)) {
      const dist = Math.sqrt((x - s * 0.5) ** 2 + (y - s * 0.48) ** 2) / (s * 0.18)
      canvas[y][x] = lerpColor('#DEB887', '#D2A679', dist * 0.3)
      canvas[y][x] = dither(canvas[y][x], x, y, 5)
    } else if (inCircle(x, y, s * 0.5, s * 0.48, s * 0.25)) {
      // 头发轮廓周围
      canvas[y][x] = pickFromPalette(hairPalette, x, y, 12)
    }
    
    // 眼睛和眉毛（极简）
    if (inCircle(x, y, Math.floor(s * 0.43), Math.floor(s * 0.42), 1)) {
      canvas[y][x] = '#3C2415'
    }
    if (inCircle(x, y, Math.floor(s * 0.57), Math.floor(s * 0.42), 1)) {
      canvas[y][x] = '#3C2415'
    }
    // 微笑
    if (y === Math.floor(s * 0.55) && x >= Math.floor(s * 0.42) && x <= Math.floor(s * 0.58)) {
      canvas[y][x] = dither('#C8956B', x, y, 3)
    }
  }
  return canvas
}

// 记忆的永恒 - 达利
function generatePersistenceOfMemory(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#D2B48C', s)
  const clockPalette = ['#DEB887','#D2A679','#E0B88A','#C8956B','#D4A574']
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    // 海面/天空渐变
    canvas[y][x] = lerpColor('#87CEEB', '#D2B48C', y / s)
    canvas[y][x] = dither(canvas[y][x], x, y, 10)
    
    // 融化时钟（椭圆）
    const dx = x - s * 0.45
    const dy = y - s * 0.55
    if (dx * dx / (s * 0.2 * s * 0.2) + dy * dy / (s * 0.12 * s * 0.12) <= 1) {
      canvas[y][x] = pickFromPalette(clockPalette, x, y, 8)
    }
    // 时钟上数字小点
    if (inCircle(x, y, Math.floor(s * 0.45), Math.floor(s * 0.5), 1) ||
        inCircle(x, y, Math.floor(s * 0.5), Math.floor(s * 0.55), 1)) {
      canvas[y][x] = '#8B4513'
    }
  }
  return canvas
}

// 呐喊 - 蒙克
function generateTheScream(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#FF6347', s)
  const skyPalette = ['#FF6347','#FF7F50','#FF4500','#FF8C00','#FFA07A']
  const figurePalette = ['#2F4F4F','#3A5A5A','#254545','#4A6A6A','#1A3A3A']
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    // 背景天空——橙色/红色渐变
    canvas[y][x] = lerpColor('#FF6347', '#FF8C00', x / s)
    canvas[y][x] = dither(canvas[y][x], x, y, 15)
    
    // 人物身体
    if (inRect(x, y, Math.floor(s * 0.3), Math.floor(s * 0.25), Math.floor(s * 0.4), Math.floor(s * 0.6))) {
      canvas[y][x] = pickFromPalette(figurePalette, x, y, 8)
    }
    
    // 头部呐喊
    if (inCircle(x, y, s * 0.5, s * 0.35, s * 0.12)) {
      const dist = Math.sqrt((x - s * 0.5) ** 2 + (y - s * 0.35) ** 2) / (s * 0.12)
      canvas[y][x] = lerpColor('#B0A090', '#8B7355', dist)
      canvas[y][x] = dither(canvas[y][x], x, y, 8)
    }
    // 嘴巴（呐喊形状）
    if (inCircle(x, y, Math.floor(s * 0.5), Math.floor(s * 0.38), 2)) {
      canvas[y][x] = dither('#3C2415', x, y, 5)
    }
    // 手臂
    if (inCircle(x, y, Math.floor(s * 0.36), Math.floor(s * 0.42), 2)) {
      canvas[y][x] = dither('#2F4F4F', x, y, 5)
    }
  }
  return canvas
}

// 戴珍珠耳环的少女 - 维米尔
function generateGirlWithPearlEarring(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#1C1C2E', s)
  const scarfPalette = ['#4169E1','#3558C4','#4A7AE8','#2E4DB0','#5578D5']
  const skinPalette = ['#DEB887','#D2A679','#D4A574','#C8956B','#E0B88A']
  const clothPalette = ['#8B5A2B','#7A4A20','#9A6A3B','#6A3A10','#B08050']
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    // 面部+头巾区域
    if (inRect(x, y, Math.floor(s * 0.3), Math.floor(s * 0.2), Math.floor(s * 0.45), Math.floor(s * 0.65))) {
      if (y < s * 0.42) {
        // 蓝色头巾渐变
        canvas[y][x] = lerpColor('#4169E1', '#3558C4', x / s)
        canvas[y][x] = dither(canvas[y][x], x, y, 8)
      } else {
        canvas[y][x] = pickFromPalette(skinPalette, x, y, 6)
      }
    } else {
      // 背景黑
      canvas[y][x] = dither('#1C1C2E', x, y, 5)
    }
    
    // 衣服（非面部区域的下方）
    if (y > s * 0.65 && inRect(x, y, Math.floor(s * 0.25), Math.floor(s * 0.6), Math.floor(s * 0.5), Math.floor(s * 0.3))) {
      canvas[y][x] = pickFromPalette(clothPalette, x, y, 10)
    }
    
    // 珍珠耳环
    if (inCircle(x, y, Math.floor(s * 0.72), Math.floor(s * 0.58), 2)) {
      const dist = Math.sqrt((x - s * 0.72) ** 2 + (y - s * 0.58) ** 2) / 2
      canvas[y][x] = lerpColor('#FFF8DC', '#E8D0B0', dist)
      canvas[y][x] = dither(canvas[y][x], x, y, 5)
    }
    
    // 眼睛
    if (inCircle(x, y, Math.floor(s * 0.42), Math.floor(s * 0.38), 1)) {
      canvas[y][x] = '#2D1A0E'
    }
    if (inCircle(x, y, Math.floor(s * 0.5), Math.floor(s * 0.38), 1)) {
      canvas[y][x] = '#2D1A0E'
    }
  }
  return canvas
}

// 夜巡 - 伦勃朗
function generateTheNightWatch(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#1C1C1C', s)
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    canvas[y][x] = dither('#1C1C1C', x, y, 8)
    
    // 金色高光（伦勃朗光）
    const lens = (x * 3 + y * 5 + 7) % Math.max(1, Math.floor(s / 8))
    if (lens < 2) {
      canvas[y][x] = dither('#DAA520', x, y, 12)
    }
    // 暗部层次
    if ((x + y) % 5 === 0) {
      canvas[y][x] = dither('#2A2A2A', x, y, 6)
    }
    // 次要人物高光
    if (Math.floor(y / (s/4)) % 2 === 0 && (x * 7) % 13 === 0) {
      canvas[y][x] = dither('#B8860B', x, y, 8)
    }
  }
  return canvas
}

// 格尔尼卡 - 毕加索
function generateGuernica(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#FFFFFF', s)
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const v = (x * 7 + y * 13) % 5
    const shade = ['#FFFFFF','#E0E0E0','#C0C0C0','#808080','#000000'][v]
    canvas[y][x] = dither(shade, x, y, 10)
    
    // 抽象形态
    if (inCircle(x, y, s * 0.35, s * 0.4, s * 0.15) && v > 2) {
      canvas[y][x] = dither('#333333', x, y, 5)
    }
    if (inCircle(x, y, s * 0.65, s * 0.45, s * 0.12) && v > 2) {
      canvas[y][x] = dither('#444444', x, y, 5)
    }
  }
  return canvas
}

// 吻 - 克里姆特
function generateTheKiss(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#2F2F2F', s)
  const goldPalette = ['#FFD700','#DAA520','#FFC125','#E6B800','#FFD633']
  const brownPalette = ['#8B4513','#A0522D','#7A3B10','#9A5A2A','#6B3010']
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    // 金色拥抱区
    if (inCircle(x, y, s * 0.45, s * 0.55, s * 0.35)) {
      canvas[y][x] = pickFromPalette(goldPalette, x, y, 12)
      // 装饰性图案
      if ((x + y) % 3 === 0) {
        canvas[y][x] = dither('#FFEFB0', x, y, 5)
      }
    } else if (inCircle(x, y, s * 0.55, s * 0.5, s * 0.3)) {
      canvas[y][x] = pickFromPalette(brownPalette, x, y, 10)
    } else {
      canvas[y][x] = dither('#2F2F2F', x, y, 5)
      // 金色装饰边框
      if ((x % 2 === 0 && y % 4 === 0) || (y % 2 === 0 && x % 4 === 0)) {
        canvas[y][x] = dither('#DAA520', x, y, 6)
      }
    }
  }
  return canvas
}

// 构成第七号 - 康定斯基
function generateCompositionVII(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#F5F5F5', s)
  const colors = ['#FF0000','#FF8C00','#0000FF','#FFFF00','#FF1493']
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    canvas[y][x] = dither('#F5F5F5', x, y, 5)
    
    if (inCircle(x, y, s * 0.3, s * 0.35, s * 0.2)) {
      canvas[y][x] = dither('#FF0000', x + y, x - y, 10)
    } else if (inCircle(x, y, s * 0.6, s * 0.5, s * 0.15)) {
      canvas[y][x] = dither('#0000FF', x * 2, y * 2, 10)
    } else if (inCircle(x, y, s * 0.4, s * 0.7, s * 0.12)) {
      canvas[y][x] = dither('#FFFF00', x, y, 8)
    } else if (inCircle(x, y, s * 0.7, s * 0.25, s * 0.1)) {
      canvas[y][x] = dither('#FF1493', x, y, 12)
    } else if (inRect(x, y, Math.floor(s * 0.1), Math.floor(s * 0.5), Math.floor(s * 0.15), Math.floor(s * 0.35))) {
      canvas[y][x] = dither('#FF8C00', x, y, 10)
    }
    
    // 线条/点缀
    if ((x % 5 === 0 && y % 3 === 0) || (y % 7 === 0 && x % 2 === 0)) {
      canvas[y][x] = pickFromPalette(colors, x, y, 15)
    }
  }
  return canvas
}

// 红气球 - 保罗·克利
function generateRedBalloon(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#F5F5F5', s)
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    canvas[y][x] = dither('#F5F5F5', x, y, 8)
    
    if (inCircle(x, y, s * 0.5, s * 0.35, s * 0.2)) {
      const dx = x - s * 0.5, dy = y - s * 0.35
      const dist = Math.sqrt(dx*dx + dy*dy) / (s * 0.2)
      canvas[y][x] = lerpColor('#FF0000', '#CC0000', dist)
      canvas[y][x] = dither(canvas[y][x], x, y, 10)
    }
    // 绳子
    if (y > s * 0.52 && Math.abs(x - s * 0.5) <= 0.5) {
      canvas[y][x] = dither('#8B4513', x, y, 5)
    }
  }
  return canvas
}

// 美国哥特式 - 格兰特·伍德
function generateAmericanGothic(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#191970', s)
  const facePalette = ['#8B7355','#7A6345','#9A8365','#6A5335','#A09070']
  const hatPalette = ['#3C2415','#2D1A0E','#4A2C1A','#221005','#583520']
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    canvas[y][x] = dither('#191970', x, y, 5)
    
    // 人物区域
    if (inRect(x, y, Math.floor(s * 0.25), Math.floor(s * 0.35), Math.floor(s * 0.5), Math.floor(s * 0.55))) {
      canvas[y][x] = pickFromPalette(facePalette, x, y, 8)
      // 帽子
      if (y < s * 0.4) {
        canvas[y][x] = pickFromPalette(hatPalette, x, y, 10)
      }
      // 衣服深色
      if (y > s * 0.65) {
        canvas[y][x] = dither('#3C2415', x, y, 8)
      }
    }
    
    // 叉子
    if (y >= Math.floor(s * 0.4) && y <= Math.floor(s * 0.65) && Math.abs(x - s * 0.7) <= 0.5) {
      canvas[y][x] = dither('#000000', x, y, 3)
    }
    // 农舍背景纹理
    if (y < s * 0.3 && (x + y) % 4 === 0) {
      canvas[y][x] = dither('#202080', x, y, 5)
    }
  }
  return canvas
}

// 维纳斯的诞生 - 波提切利
function generateBirthOfVenus(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#4682B4', s)
  const skinPalette = ['#DEB887','#D2A679','#D4A574','#C8956B','#E8C8A8']
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    canvas[y][x] = vGradient(x, y, s, '#87CEEB', '#4682B4')
    canvas[y][x] = dither(canvas[y][x], x, y, 10)
    
    if (inCircle(x, y, s * 0.5, s * 0.52, s * 0.25)) {
      const dist = Math.sqrt((x - s * 0.5) ** 2 + (y - s * 0.52) ** 2) / (s * 0.25)
      canvas[y][x] = lerpColor('#DEB887', '#D2A679', dist * 0.4)
      canvas[y][x] = dither(canvas[y][x], x, y, 6)
    }
    // 金色长发
    if (inCircle(x, y, s * 0.4, s * 0.4, s * 0.08)) {
      canvas[y][x] = dither('#DAA520', x, y, 10)
    }
    if (inCircle(x, y, s * 0.6, s * 0.4, s * 0.08)) {
      canvas[y][x] = dither('#DAA520', x, y, 10)
    }
    // 贝壳轮廓
    if (inCircle(x, y, s * 0.5, s * 0.52, s * 0.3) && !inCircle(x, y, s * 0.5, s * 0.52, s * 0.25)) {
      canvas[y][x] = dither('#DEB887', x, y, 5)
    }
  }
  return canvas
}

// 宫娥 - 委拉斯开兹
function generateLasMeninas(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#8B4513', s)
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    canvas[y][x] = dither('#8B4513', x, y, 12)
    
    if ((x + y) % 4 === 0) {
      canvas[y][x] = dither('#DAA520', x, y, 10)
    }
    if (inRect(x, y, Math.floor(s * 0.35), Math.floor(s * 0.3), Math.floor(s * 0.3), Math.floor(s * 0.4))) {
      canvas[y][x] = dither('#FFD700', x, y, 10)
      if ((x * 5) % 7 === 0) {
        canvas[y][x] = dither('#FFF8DC', x, y, 5)
      }
    }
    // 镜框
    if (inRect(x, y, Math.floor(s * 0.45), Math.floor(s * 0.25), Math.floor(s * 0.12), Math.floor(s * 0.18))) {
      canvas[y][x] = dither('#DAA520', x, y, 8)
    }
  }
  return canvas
}

// 人间乐园 - 博斯
function generateGardenOfEarthlyDelights(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#9370DB', s)
  const palette = ['#FF69B4','#00FA9A','#FFD700','#9370DB','#FF6347','#00BFFF','#FF4500']
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    canvas[y][x] = pickFromPalette(palette, x, y, 15)
    
    if (inCircle(x, y, s * 0.25, s * 0.45, s * 0.15)) {
      canvas[y][x] = dither('#FF69B4', x * 3, y * 3, 12)
    } else if (inCircle(x, y, s * 0.5, s * 0.5, s * 0.12)) {
      canvas[y][x] = dither('#00FA9A', x * 5, y * 7, 12)
    } else if (inCircle(x, y, s * 0.72, s * 0.4, s * 0.14)) {
      canvas[y][x] = dither('#FFD700', x * 11, y * 13, 12)
    }
  }
  return canvas
}

// 西斯廷天顶画 - 米开朗基罗
function generateSistineChapel(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#4682B4', s)
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    canvas[y][x] = vGradient(x, y, s, '#6BAED6', '#4682B4')
    canvas[y][x] = dither(canvas[y][x], x, y, 8)
    
    // 上帝之手（发光区域）
    if (inCircle(x, y, s * 0.5, s * 0.35, s * 0.25)) {
      const dist = Math.sqrt((x - s * 0.5) ** 2 + (y - s * 0.35) ** 2) / (s * 0.25)
      canvas[y][x] = lerpColor('#FFD700', '#DAA520', dist)
      canvas[y][x] = dither(canvas[y][x], x, y, 10)
    }
    // 人物轮廓
    if (inCircle(x, y, s * 0.5, s * 0.35, s * 0.22) && (x * 7 + y * 13) % 3 === 0) {
      canvas[y][x] = dither('#8B7355', x, y, 6)
    }
  }
  return canvas
}

// 最后的晚餐 - 达芬奇
function generateLastSupper(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#8B0000', s)
  const tablePalette = ['#8B4513','#7A3B10','#9A5A2A','#6B3010','#A06030']
  const wallPalette = ['#8B0000','#7A0000','#9A1010','#6B0000','#A02020']
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    if (y >= s * 0.35 && y <= s * 0.8) {
      canvas[y][x] = pickFromPalette(tablePalette, x, y, 10)
    } else {
      canvas[y][x] = pickFromPalette(wallPalette, x, y, 8)
    }
    
    // 桌子
    if (y >= Math.floor(s * 0.6) && y < Math.floor(s * 0.7)) {
      canvas[y][x] = dither('#8B4513', x, y, 8)
    }
    // 桌子上的白色桌布
    if (y === Math.floor(s * 0.6) && x >= Math.floor(s * 0.15) && x <= Math.floor(s * 0.85)) {
      canvas[y][x] = dither('#F5F0E0', x, y, 5)
    }
    // 窗外光（背景中央上方）
    if (y < s * 0.25 && x > s * 0.35 && x < s * 0.65) {
      canvas[y][x] = dither('#87CEEB', x, y, 8)
    }
  }
  return canvas
}

// 向日葵 - 梵高
function generateSunflowers(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#90EE90', s)
  const flowerPalette = ['#FFD700','#FFC125','#E6B800','#FFCC33','#DAA520']
  const centerPalette = ['#8B4513','#A0522D','#7A3B10','#9A5A2A','#6B3010']
  
  const centers = [
    [s * 0.2, s * 0.35],[s * 0.4, s * 0.3],[s * 0.6, s * 0.35],
    [s * 0.75, s * 0.4],[s * 0.3, s * 0.5],[s * 0.5, s * 0.45],[s * 0.65, s * 0.52],
  ]
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    canvas[y][x] = lerpColor('#90EE90', '#7DD17D', x / s)
    canvas[y][x] = dither(canvas[y][x], x, y, 10)
    
    for (const [cx, cy] of centers) {
      if (inCircle(x, y, cx, cy, s * 0.1)) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (s * 0.1)
        if (dist < 0.4) {
          canvas[y][x] = pickFromPalette(centerPalette, x, y, 10) // 花蕊
        } else {
          canvas[y][x] = pickFromPalette(flowerPalette, x + Math.floor(cx), y + Math.floor(cy), 12) // 花瓣
        }
      }
    }
    
    // 花瓶
    if (y >= Math.floor(s * 0.6) && x >= Math.floor(s * 0.35) && x < Math.floor(s * 0.65)) {
      canvas[y][x] = dither('#8B4513', x, y, 8)
    }
  }
  return canvas
}

// 思想者 - 罗丹
function generateTheThinker(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#2F2F2F', s)
  const bronzePalette = ['#CD7F32','#B8860B','#DAA520','#C0A040','#D4A060']
  
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    canvas[y][x] = dither('#2F2F2F', x, y, 6)
    
    if (inCircle(x, y, s * 0.48, s * 0.42, s * 0.35)) {
      const dist = Math.sqrt((x - s * 0.48) ** 2 + (y - s * 0.42) ** 2) / (s * 0.35)
      canvas[y][x] = lerpColor('#CD7F32', '#B8860B', dist * 0.5)
      canvas[y][x] = dither(canvas[y][x], x, y, 8)
    }
    // 高光
    if (y < s * 0.3 && x > s * 0.35 && x < s * 0.55 && (x + y) % 5 === 0) {
      canvas[y][x] = dither('#DAA520', x, y, 6)
    }
  }
  return canvas
}

// ====== 名画集合 ======

interface PaintingEntry {
  id: string
  title: string
  artist: string
  year: string
  generator: Generator
}

const PAINTING_ENTRIES: PaintingEntry[] = [
  { id: 'starry-night',              title: '星月夜',           artist: '梵高',       year: '1889', generator: generateStarryNight },
  { id: 'water-lilies',              title: '睡莲',             artist: '莫奈',       year: '1906', generator: generateWaterLilies },
  { id: 'great-wave',                title: '神奈川冲浪里',     artist: '葛饰北斋',   year: '1831', generator: generateGreatWave },
  { id: 'mona-lisa',                 title: '蒙娜丽莎',         artist: '达芬奇',     year: '1503', generator: generateMonaLisa },
  { id: 'the-persistence-of-memory', title: '记忆的永恒',       artist: '达利',       year: '1931', generator: generatePersistenceOfMemory },
  { id: 'the-scream',                title: '呐喊',             artist: '蒙克',       year: '1893', generator: generateTheScream },
  { id: 'girl-with-pearl-earring',   title: '戴珍珠耳环的少女', artist: '维米尔',     year: '1665', generator: generateGirlWithPearlEarring },
  { id: 'the-night-watch',           title: '夜巡',             artist: '伦勃朗',     year: '1642', generator: generateTheNightWatch },
  { id: 'guernica',                  title: '格尔尼卡',         artist: '毕加索',     year: '1937', generator: generateGuernica },
  { id: 'the-kiss',                  title: '吻',               artist: '克里姆特',   year: '1908', generator: generateTheKiss },
  { id: 'composition-vii',           title: '构成第七号',       artist: '康定斯基',   year: '1913', generator: generateCompositionVII },
  { id: 'red-balloon',               title: '红气球',           artist: '保罗·克利', year: '1922', generator: generateRedBalloon },
  { id: 'american-gothic',           title: '美国哥特式',       artist: '格兰特·伍德', year: '1930', generator: generateAmericanGothic },
  { id: 'the-birth-of-venus',        title: '维纳斯的诞生',     artist: '波提切利',   year: '1485', generator: generateBirthOfVenus },
  { id: 'las-meninas',               title: '宫娥',             artist: '委拉斯开兹', year: '1656', generator: generateLasMeninas },
  { id: 'the-garden-of-earthly-delights', title: '人间乐园',    artist: '博斯',       year: '1500', generator: generateGardenOfEarthlyDelights },
  { id: 'the-sistine-chapel-ceiling',     title: '西斯廷天顶画',artist: '米开朗基罗', year: '1512', generator: generateSistineChapel },
  { id: 'the-last-supper',            title: '最后的晚餐',      artist: '达芬奇',     year: '1498', generator: generateLastSupper },
  { id: 'sunflowers',                 title: '向日葵',          artist: '梵高',       year: '1888', generator: generateSunflowers },
  { id: 'the-thinker',                title: '思想者',          artist: '罗丹',       year: '1904', generator: generateTheThinker },
]

// 生成渲染后的名画列表（默认 TEMPLATE_SIZE）
export const FAMOUS_PAINTINGS: PaintingTemplate[] = PAINTING_ENTRIES.map(e => ({
  id: e.id,
  title: e.title,
  artist: e.artist,
  year: e.year,
  pixelData: e.generator(TEMPLATE_SIZE),
}))

// 获取随机名画
export function getRandomPainting(): PaintingTemplate {
  return FAMOUS_PAINTINGS[Math.floor(Math.random() * FAMOUS_PAINTINGS.length)]
}

// 获取所有名画列表（供 Admin 选择/预览）
export function getAllPaintings(): PaintingTemplate[] {
  return FAMOUS_PAINTINGS
}

// 获取名画列表（不含像素数据，轻量版供 API 响应）
export function getPaintingsList(): Pick<PaintingTemplate, 'id' | 'title' | 'artist' | 'year'>[] {
  return FAMOUS_PAINTINGS.map(p => ({ id: p.id, title: p.title, artist: p.artist, year: p.year }))
}

// 根据亮度排序像素（用于底稿引导填充）
export function getSortedPixelsByBrightness(painting: PaintingTemplate): {x: number, y: number, color: string, brightness: number}[] {
  const pixels: {x: number, y: number, color: string, brightness: number}[] = []
  const size = painting.pixelData.length
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = painting.pixelData[y][x]
      const brightness = hexToBrightness(color)
      pixels.push({ x, y, color, brightness })
    }
  }
  return pixels.sort((a, b) => b.brightness - a.brightness)
}

// Hex 颜色转亮度 (0-255)
function hexToBrightness(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000
}

// 默认底稿：星月夜
export const DEFAULT_TEMPLATE = FAMOUS_PAINTINGS[0]
