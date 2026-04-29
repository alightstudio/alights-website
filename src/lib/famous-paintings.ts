// 世界名画像素数据（彩色底稿）
// 每幅画包含：id, title, artist, year, pixelData (二维数组，每个元素为 hex 颜色)

export const TEMPLATE_SIZE = 40

export interface PaintingTemplate {
  id: string
  title: string
  artist: string
  year: string
  pixelData: string[][] // TEMPLATE_SIZE rows × TEMPLATE_SIZE cols, each cell is hex color
}

// 生成函数类型：接受 size 参数（默认 TEMPLATE_SIZE），返回 size×size 像素数据
type Generator = (size?: number) => string[][]

// ====== 生成器工具函数 ======

/** 在圆内的像素返回颜色，否则返回背景色 */
function circle(x: number, y: number, cx: number, cy: number, r: number): boolean {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

/** 在矩形内的像素返回颜色，否则返回背景色 */
function rect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh
}

/** 创建空白画布（全部填背景色） */
function empty(bg: string, size: number): string[][] {
  return Array.from({ length: size }, () => Array(size).fill(bg))
}

// ====== 各名画生成器 ======

// 星月夜 - 梵高
function generateStarryNight(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#1B2A4A', s)
  // 前景
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (y >= s * 0.65) {
        canvas[y][x] = '#1A1A2E' // 前景深蓝
      } else if (y >= s * 0.42) {
        canvas[y][x] = '#2C3E50' // 山丘
      }
    }
  }
  // 月亮
  const moonCX = Math.floor(s * 0.52)
  const moonCY = Math.floor(s * 0.18)
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (y < s * 0.42 && circle(x, y, moonCX, moonCY, 2)) {
        canvas[y][x] = '#FFF8DC'
      }
    }
  }
  // 星星（随机分布）
  for (let y = 0; y < s * 0.4; y++) {
    for (let x = 0; x < s; x++) {
      if (y < s * 0.42 && canvas[y][x] === '#1B2A4A') {
        const denom = Math.max(1, Math.floor(s * 0.3)) // denser for larger
        if ((x * 7 + y * 13) % denom === 0) {
          canvas[y][x] = '#F5E642'
        }
      }
    }
  }
  return canvas
}

// 睡莲 - 莫奈
function generateWaterLilies(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#2E8B57', s)
  // 睡莲花丛
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (circle(x, y, s * 0.42, s * 0.5, s * 0.2) || circle(x, y, s * 0.62, s * 0.45, s * 0.18)) {
        canvas[y][x] = (x * 7 + y * 11) % 5 < 2 ? '#FFB6C1' : '#90EE90'
      } else if (circle(x, y, s * 0.5, s * 0.3, s * 0.12)) {
        canvas[y][x] = '#90EE90'
      }
    }
  }
  return canvas
}

// 神奈川冲浪里 - 葛饰北斋
function generateGreatWave(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#87CEEB', s)
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const waveY = Math.floor(Math.sin(x * 0.3) * (s * 0.12) + s * 0.62)
      if (y >= waveY - 1 && y <= waveY + 1) {
        canvas[y][x] = '#FFFFFF'
      } else if (y > waveY) {
        canvas[y][x] = '#1E3A5F'
      }
    }
  }
  return canvas
}

// 蒙娜丽莎 - 达芬奇
function generateMonaLisa(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#4A6741', s)
  // 人物轮廓
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (rect(x, y, Math.floor(s * 0.2), Math.floor(s * 0.3), Math.floor(s * 0.6), Math.floor(s * 0.55))) {
        canvas[y][x] = '#B8860B'
      }
    }
  }
  // 脸部
  const faceCX = Math.floor(s * 0.5)
  const faceCY = Math.floor(s * 0.5)
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (circle(x, y, faceCX, faceCY, s * 0.18)) {
        canvas[y][x] = '#DEB887'
      }
    }
  }
  // 头发
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (y < s * 0.38 && x > s * 0.3 && x < s * 0.7) {
        canvas[y][x] = '#3C2415'
      }
    }
  }
  return canvas
}

// 记忆的永恒 - 达利
function generatePersistenceOfMemory(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#D2B48C', s)
  // 融化时钟
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = x - s * 0.45
      const dy = y - s * 0.55
      if (dx * dx / (s * 0.2 * s * 0.2) + dy * dy / (s * 0.12 * s * 0.12) <= 1) {
        canvas[y][x] = '#DEB887'
      }
    }
  }
  return canvas
}

// 呐喊 - 蒙克
function generateTheScream(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#FF6347', s)
  // 人物
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (rect(x, y, Math.floor(s * 0.3), Math.floor(s * 0.25), Math.floor(s * 0.4), Math.floor(s * 0.6))) {
        canvas[y][x] = '#2F4F4F'
      }
    }
  }
  // 头部呐喊
  const headCX = Math.floor(s * 0.5)
  const headCY = Math.floor(s * 0.35)
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (circle(x, y, headCX, headCY, s * 0.12)) {
        canvas[y][x] = '#8B7355'
      }
    }
  }
  return canvas
}

// 戴珍珠耳环的少女 - 维米尔
function generateGirlWithPearlEarring(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#1C1C2E', s)
  // 蓝色头巾 + 面部 + 衣服
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (rect(x, y, Math.floor(s * 0.3), Math.floor(s * 0.2), Math.floor(s * 0.45), Math.floor(s * 0.65))) {
        if (y < s * 0.42) {
          canvas[y][x] = '#4169E1' // 蓝色头巾
        } else {
          canvas[y][x] = '#DEB887' // 衣服/皮肤
        }
      }
    }
  }
  // 珍珠耳环
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (circle(x, y, Math.floor(s * 0.72), Math.floor(s * 0.58), 2)) {
        canvas[y][x] = '#FFF8DC'
      }
    }
  }
  return canvas
}

// 夜巡 - 伦勃朗
function generateTheNightWatch(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#1C1C1C', s)
  // 金色高光
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const denom = Math.max(1, Math.floor(s / 8))
      if ((x * 3 + y * 5) % denom === 0) {
        canvas[y][x] = '#DAA520'
      }
    }
  }
  return canvas
}

// 格尔尼卡 - 毕加索
function generateGuernica(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#FFFFFF', s)
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const v = (x * 7 + y * 13) % 3
      canvas[y][x] = v === 0 ? '#000000' : v === 1 ? '#808080' : '#FFFFFF'
    }
  }
  return canvas
}

// 吻 - 克里姆特
function generateTheKiss(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#2F2F2F', s)
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (circle(x, y, s * 0.45, s * 0.55, s * 0.35)) {
        canvas[y][x] = '#FFD700'
      } else if (circle(x, y, s * 0.55, s * 0.5, s * 0.3)) {
        canvas[y][x] = '#8B4513'
      }
    }
  }
  return canvas
}

// 构成第七号 - 康定斯基
function generateCompositionVII(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#F5F5F5', s)
  const colors = ['#FF0000', '#FF8C00', '#0000FF', '#FFFF00', '#FF1493']
  // 圆圈
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (circle(x, y, s * 0.3, s * 0.35, s * 0.2)) {
        canvas[y][x] = '#FF0000'
      } else if (circle(x, y, s * 0.6, s * 0.5, s * 0.15)) {
        canvas[y][x] = '#0000FF'
      } else if (circle(x, y, s * 0.4, s * 0.7, s * 0.12)) {
        canvas[y][x] = '#FFFF00'
      } else if (circle(x, y, s * 0.7, s * 0.25, s * 0.1)) {
        canvas[y][x] = '#FF1493'
      } else if (rect(x, y, Math.floor(s * 0.1), Math.floor(s * 0.5), Math.floor(s * 0.15), Math.floor(s * 0.35))) {
        canvas[y][x] = '#FF8C00'
      }
    }
  }
  return canvas
}

// 红气球 - 保罗·克利
function generateRedBalloon(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#F5F5F5', s)
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (circle(x, y, s * 0.5, s * 0.35, s * 0.2)) {
        canvas[y][x] = '#FF0000'
      }
    }
  }
  // 绳子
  for (let y = Math.floor(s * 0.52); y < s; y++) {
    const lineX = Math.floor(s * 0.5)
    canvas[y][lineX] = '#8B4513'
  }
  return canvas
}

// 美国哥特式 - 格兰特·伍德
function generateAmericanGothic(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#191970', s)
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (rect(x, y, Math.floor(s * 0.25), Math.floor(s * 0.35), Math.floor(s * 0.5), Math.floor(s * 0.55))) {
        canvas[y][x] = '#8B7355'
      }
    }
  }
  // 叉子 (pitchfork) 细节
  for (let y = Math.floor(s * 0.4); y < Math.floor(s * 0.65); y++) {
    const fx = Math.floor(s * 0.7)
    canvas[y][fx] = '#000000'
  }
  return canvas
}

// 维纳斯的诞生 - 波提切利
function generateBirthOfVenus(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#4682B4', s)
  // 贝壳/人物
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (circle(x, y, s * 0.5, s * 0.52, s * 0.25)) {
        canvas[y][x] = '#DEB887'
      }
    }
  }
  return canvas
}

// 宫娥 - 委拉斯开兹
function generateLasMeninas(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#8B4513', s)
  // 光影区域
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if ((x + y) % 4 === 0) {
        canvas[y][x] = '#DAA520'
      } else if (rect(x, y, Math.floor(s * 0.4), Math.floor(s * 0.3), Math.floor(s * 0.3), Math.floor(s * 0.4))) {
        canvas[y][x] = '#FFD700'
      }
    }
  }
  return canvas
}

// 人间乐园 - 博斯
function generateGardenOfEarthlyDelights(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#9370DB', s)
  const colors = ['#FF69B4', '#00FA9A', '#FFD700', '#9370DB', '#FF6347']
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (circle(x, y, s * 0.25, s * 0.45, s * 0.15)) {
        canvas[y][x] = '#FF69B4'
      } else if (circle(x, y, s * 0.5, s * 0.5, s * 0.12)) {
        canvas[y][x] = '#00FA9A'
      } else if (circle(x, y, s * 0.72, s * 0.4, s * 0.14)) {
        canvas[y][x] = '#FFD700'
      } else {
        canvas[y][x] = colors[(x * 3 + y * 7) % colors.length]
      }
    }
  }
  return canvas
}

// 西斯廷天顶画 - 米开朗基罗
function generateSistineChapel(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#4682B4', s)
  // 上帝之手
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (circle(x, y, s * 0.5, s * 0.35, s * 0.25)) {
        canvas[y][x] = '#FFD700'
      }
    }
  }
  return canvas
}

// 最后的晚餐 - 达芬奇
function generateLastSupper(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#8B0000', s)
  // 桌面 + 人物
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (y >= s * 0.35 && y <= s * 0.8) {
        canvas[y][x] = '#DEB887'
      }
    }
  }
  // 桌子
  for (let y = Math.floor(s * 0.6); y < Math.floor(s * 0.7); y++) {
    for (let x = Math.floor(s * 0.1); x < Math.floor(s * 0.9); x++) {
      canvas[y][x] = '#8B4513'
    }
  }
  return canvas
}

// 向日葵 - 梵高
function generateSunflowers(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#90EE90', s)
  // 花束
  const centers = [
    [s * 0.2, s * 0.35],
    [s * 0.4, s * 0.3],
    [s * 0.6, s * 0.35],
    [s * 0.75, s * 0.4],
    [s * 0.3, s * 0.5],
    [s * 0.5, s * 0.45],
    [s * 0.65, s * 0.52],
  ]
  for (const [cx, cy] of centers) {
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        if (circle(x, y, cx, cy, s * 0.1)) {
          canvas[y][x] = '#FFD700'
        }
      }
    }
  }
  // 花瓶
  for (let y = Math.floor(s * 0.6); y < s; y++) {
    for (let x = Math.floor(s * 0.35); x < Math.floor(s * 0.65); x++) {
      canvas[y][x] = '#8B4513'
    }
  }
  return canvas
}

// 思想者 - 罗丹
function generateTheThinker(size: number = TEMPLATE_SIZE): string[][] {
  const s = size
  const canvas = empty('#2F2F2F', s)
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (circle(x, y, s * 0.48, s * 0.42, s * 0.35)) {
        canvas[y][x] = '#CD7F32'
      }
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
