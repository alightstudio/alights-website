// 世界名画 24×24 像素数据（彩色底稿）
// 每幅画包含：id, title, artist, year, pixelData (24×24 二维数组，每个元素为 hex 颜色)

export interface PaintingTemplate {
  id: string
  title: string
  artist: string
  year: string
  pixelData: string[][] // 24 rows × 24 cols, each cell is hex color
}

// 名画集合（公共领域作品，按艺术家字母排序）
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
  },
  {
    id: 'mona-lisa',
    title: '蒙娜丽莎',
    artist: '达芬奇',
    year: '1503',
    pixelData: generateMonaLisa()
  },
  {
    id: 'the-persistence-of-memory',
    title: '记忆的永恒',
    artist: '达利',
    year: '1931',
    pixelData: generatePersistenceOfMemory()
  },
  {
    id: 'the-scream',
    title: '呐喊',
    artist: '蒙克',
    year: '1893',
    pixelData: generateTheScream()
  },
  {
    id: 'girl-with-pearl-earring',
    title: '戴珍珠耳环的少女',
    artist: '维米尔',
    year: '1665',
    pixelData: generateGirlWithPearlEarring()
  },
  {
    id: 'the-night-watch',
    title: '夜巡',
    artist: '伦勃朗',
    year: '1642',
    pixelData: generateTheNightWatch()
  },
  {
    id: 'guernica',
    title: '格尔尼卡',
    artist: '毕加索',
    year: '1937',
    pixelData: generateGuernica()
  },
  {
    id: 'the-kiss',
    title: '吻',
    artist: '克里姆特',
    year: '1908',
    pixelData: generateTheKiss()
  },
  {
    id: 'composition-vii',
    title: '构成第七号',
    artist: '康定斯基',
    year: '1913',
    pixelData: generateCompositionVII()
  },
  {
    id: 'red-balloon',
    title: '红气球',
    artist: '保罗·克利',
    year: '1922',
    pixelData: generateRedBalloon()
  },
  {
    id: 'american-gothic',
    title: '美国哥特式',
    artist: '格兰特·伍德',
    year: '1930',
    pixelData: generateAmericanGothic()
  },
  {
    id: 'the-birth-of-venus',
    title: '维纳斯的诞生',
    artist: '波提切利',
    year: '1485',
    pixelData: generateBirthOfVenus()
  },
  {
    id: 'las-meninas',
    title: '宫娥',
    artist: '委拉斯开兹',
    year: '1656',
    pixelData: generateLasMeninas()
  },
  {
    id: 'the-garden-of-earthly-delights',
    title: '人间乐园',
    artist: '博斯',
    year: '1500',
    pixelData: generateGardenOfEarthlyDelights()
  },
  {
    id: 'the-sistine-chapel-ceiling',
    title: '西斯廷天顶画',
    artist: '米开朗基罗',
    year: '1512',
    pixelData: generateSistineChapel()
  },
  {
    id: 'the-last-supper',
    title: '最后的晚餐',
    artist: '达芬奇',
    year: '1498',
    pixelData: generateLastSupper()
  },
  {
    id: 'sunflowers',
    title: '向日葵',
    artist: '梵高',
    year: '1888',
    pixelData: generateSunflowers()
  },
  {
    id: 'the-thinker',
    title: '思想者',
    artist: '罗丹',
    year: '1904',
    pixelData: generateTheThinker()
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

// 蒙娜丽莎 - 暖棕色调 + 天空背景
function generateMonaLisa(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if (y >= 8 && y <= 20 && x >= 6 && x <= 18) {
        row.push('#8B4513') // 人物棕
      } else {
        row.push('#87CEEB') // 天空蓝
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 记忆的永恒 - 超现实主义，暖色 + 融化时钟
function generatePersistenceOfMemory(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if (y >= 10 && y <= 16 && x >= 8 && x <= 16) {
        row.push('#DEB887') // 融化时钟
      } else {
        row.push('#F4A460') // 沙漠暖黄
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 呐喊 - 橙红天空 + 深色人物
function generateTheScream(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if (y >= 8 && y <= 18 && x >= 8 && x <= 16) {
        row.push('#2F4F4F') // 人物深灰
      } else {
        row.push('#FF6347') // 天空橙红
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 戴珍珠耳环的少女 - 蓝色头巾 + 暖色皮肤
function generateGirlWithPearlEarring(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if (y >= 6 && y <= 16 && x >= 8 && x <= 16) {
        if (x >= 10 && x <= 14 && y >= 8 && y <= 12) {
          row.push('#4169E1') // 蓝色头巾
        } else {
          row.push('#DEB887') // 皮肤暖色
        }
      } else {
        row.push('#000080') // 深色背景
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 夜巡 - 暗色调 + 金色高光
function generateTheNightWatch(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if ((x + y) % 5 === 0) {
        row.push('#DAA520') // 金色高光
      } else {
        row.push('#1C1C1C') // 深色背景
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 格尔尼卡 - 黑白灰立体主义
function generateGuernica(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      const v = (x * 7 + y * 13) % 3
      if (v === 0) row.push('#000000')
      else if (v === 1) row.push('#808080')
      else row.push('#FFFFFF')
    }
    canvas.push(row)
  }
  return canvas
}

// 吻 - 金色装饰艺术
function generateTheKiss(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if (y >= 8 && y <= 18 && x >= 7 && x <= 17) {
        row.push('#FFD700') // 金色
      } else {
        row.push('#2F2F2F') // 深色背景
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 构成第七号 - 抽象表现主义，鲜艳色彩
function generateCompositionVII(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      const v = (x * 11 + y * 7) % 5
      if (v === 0) row.push('#FF0000')
      else if (v === 1) row.push('#00FF00')
      else if (v === 2) row.push('#0000FF')
      else if (v === 3) row.push('#FFFF00')
      else row.push('#FF00FF')
    }
    canvas.push(row)
  }
  return canvas
}

// 红气球 - 简洁，红黑对比
function generateRedBalloon(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if ((x - 12) ** 2 + (y - 8) ** 2 <= 25) {
        row.push('#FF0000') // 红气球
      } else {
        row.push('#F5F5F5') // 浅灰背景
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 美国哥特式 - 深蓝天空 + 人物
function generateAmericanGothic(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if (y >= 10 && y <= 20 && x >= 7 && x <= 17) {
        row.push('#8B7355') // 人物
      } else {
        row.push('#191970') // 深蓝天空
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 维纳斯的诞生 - 海蓝 + 人物肤色
function generateBirthOfVenus(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if (y >= 8 && y <= 18 && x >= 8 && x <= 16) {
        row.push('#DEB887') // 人物肤色
      } else {
        row.push('#4682B4') // 海水蓝
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 宫娥 - 暖色调 + 光影
function generateLasMeninas(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if ((x + y) % 3 === 0) {
        row.push('#DAA520') // 金色
      } else {
        row.push('#8B4513') // 棕色
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 人间乐园 - 鲜艳色彩，伊甸园
function generateGardenOfEarthlyDelights(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      const v = (x * 13 + y * 11) % 4
      if (v === 0) row.push('#FF69B4')
      else if (v === 1) row.push('#00FA9A')
      else if (v === 2) row.push('#FFD700')
      else row.push('#9370DB')
    }
    canvas.push(row)
  }
  return canvas
}

// 西斯廷天顶画 - 创世纪，暖色调
function generateSistineChapel(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if (y >= 6 && y <= 16 && x >= 9 && x <= 15) {
        row.push('#FFD700') // 上帝金光
      } else {
        row.push('#4682B4') // 天空蓝
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 最后的晚餐 - 暖色室内 + 人物
function generateLastSupper(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if (y >= 10 && y <= 20 && x >= 2 && x <= 22) {
        row.push('#DEB887') // 人物
      } else {
        row.push('#8B0000') // 深红背景
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 向日葵 - 黄色花朵 + 棕色茎
function generateSunflowers(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if ((x - 12) ** 2 + (y - 10) ** 2 <= 36) {
        row.push('#FFD700') // 向日葵黄
      } else if (y > 16) {
        row.push('#8B4513') // 茎棕色
      } else {
        row.push('#90EE90') // 绿叶
      }
    }
    canvas.push(row)
  }
  return canvas
}

// 思想者 - 青铜色人物 + 深色背景
function generateTheThinker(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      if (y >= 6 && y <= 20 && x >= 8 && x <= 16) {
        row.push('#CD7F32') // 青铜色
      } else {
        row.push('#2F2F2F') // 深色背景
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

// 获取所有名画列表（供 Admin 选择）
export function getAllPaintings(): PaintingTemplate[] {
  return FAMOUS_PAINTINGS
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
