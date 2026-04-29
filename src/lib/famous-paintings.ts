// 世界名画 24×24 像素数据（彩色底稿）
// 每幅画包含：id, title, artist, year, pixelData (24×24 二维数组，每个元素为 hex 颜色)

export interface PaintingTemplate {
  id: string
  title: string
  artist: string
  year: string
  pixelData: string[][] // 24 rows × 24 cols, each cell is hex color
}

// 名画集合（公共领域作品）
export const FAMOUS_PAINTINGS: PaintingTemplate[] = [
  {
    id: 'starry-night',
    title: '星月夜',
    artist: '梵高',
    year: '1889',
    pixelData: generateStarryNight()
  },
  {
    id: 'water-lilies',
    title: '睡莲',
    artist: '莫奈',
    year: '1906',
    pixelData: generateWaterLilies()
  },
  {
    id: 'great-wave',
    title: '神奈川冲浪里',
    artist: '葛饰北斋',
    year: '1831',
    pixelData: generateGreatWave()
  }
]

// 生成函数（简化版，代表名画主要色彩特征）
function generateStarryNight(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      // 夜空：深蓝 + 星星/月亮
      if (y < 10) {
        if ((x === 12 || x === 13) && y >= 4 && y <= 6) {
          row.push('#FFF8DC') // 月亮
        } else if ((x + y) % 8 === 0 || (x * 13 + y * 7) % 11 === 0) {
          row.push('#F5E642') // 星星黄
        } else {
          row.push('#1B2A4A') // 深蓝夜空
        }
      } else if (y >= 10 && y < 16) {
        row.push('#2C3E50') // 山丘
      } else {
        row.push('#1A1A2E') // 前景深蓝
      }
    }
    canvas.push(row)
  }
  return canvas
}

function generateWaterLilies(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      // 水面 + 睡莲
      if (y >= 10 && y <= 14 && x >= 9 && x <= 15) {
        row.push('#FFB6C1') // 睡莲粉
      } else if ((x * 17 + y * 13) % 7 === 0) {
        row.push('#90EE90') // 荷叶绿
      } else {
        row.push('#2E8B57') // 水面深绿
      }
    }
    canvas.push(row)
  }
  return canvas
}

function generateGreatWave(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      // 波浪形状
      const waveY = Math.floor(Math.sin(x * 0.4) * 3 + 14)
      if (y === waveY || y === waveY - 1) {
        row.push('#FFFFFF') // 浪花白
      } else if (y > waveY) {
        row.push('#1E3A5F') // 深海蓝
      } else {
        row.push('#87CEEB') // 天空浅蓝
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 获取随机名画
export function getRandomPainting(): PaintingTemplate {
  return FAMOUS_PAINTINGS[Math.floor(Math.random() * FAMOUS_PAINTINGS.length)]
}

// 根据亮度排序像素（用于底稿引导填充）
export function getSortedPixelsByBrightness(painting: PaintingTemplate): {x: number, y: number, color: string}[] {
  const pixels: {x: number, y: number, color: string, brightness: number}[] = []
  
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const color = painting.pixelData[y][x]
      const brightness = hexToBrightness(color)
      pixels.push({ x, y, color, brightness })
    }
  }
  
  // 按亮度从高到低排序（最亮的先填充）
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
