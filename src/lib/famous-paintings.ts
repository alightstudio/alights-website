// 世界名画像素数据（从真实名画图片提取 80x80 像素）
// 数据来源: 百度图片搜索 → Pillow LANCZOS 缩放
// ⚠ 像素数据（FAMOUS_PAINTINGS）位于 src/data/painting-pixels.ts，仅由服务端导入

export const TEMPLATE_SIZE = 80

// ============================================================
// 双线性插值：当画布尺寸大于底稿时，相邻像素取平滑渐变颜色
// 而非粗暴取整，让 80×80 及以上画布仍然能变清晰
// ============================================================

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return '#' + [r, g, b].map(c => clamp(c).toString(16).padStart(2, '0')).join('')
}

/**
 * 双线性插值采样底稿像素
 */
export function samplePixelBilinear(data: string[][], fx: number, fy: number): string {
  const h = data.length
  const w = data[0].length
  const cx = Math.max(0, Math.min(fx, w - 1))
  const cy = Math.max(0, Math.min(fy, h - 1))
  const x1 = Math.floor(cx)
  const y1 = Math.floor(cy)
  const x2 = Math.min(x1 + 1, w - 1)
  const y2 = Math.min(y1 + 1, h - 1)
  const dx = cx - x1
  const dy = cy - y1
  const c11 = hexToRgb(data[y1][x1])
  const c21 = hexToRgb(data[y1][x2])
  const c12 = hexToRgb(data[y2][x1])
  const c22 = hexToRgb(data[y2][x2])
  const r = (1 - dx) * (1 - dy) * c11[0] + dx * (1 - dy) * c21[0] + (1 - dx) * dy * c12[0] + dx * dy * c22[0]
  const g = (1 - dx) * (1 - dy) * c11[1] + dx * (1 - dy) * c21[1] + (1 - dx) * dy * c12[1] + dx * dy * c22[1]
  const b = (1 - dx) * (1 - dy) * c11[2] + dx * (1 - dy) * c21[2] + (1 - dx) * dy * c12[2] + dx * dy * c22[2]
  return rgbToHex(r, g, b)
}

/**
 * 获取画布坐标对应的底稿颜色（双线性插值 → 平滑清晰）
 * 用于 80×80 画布填充
 */
export function getTemplateColor(
  canvasSize: number,
  x: number,
  y: number,
  template: PaintingTemplate
): string {
  const fx = (x / canvasSize) * TEMPLATE_SIZE
  const fy = (y / canvasSize) * TEMPLATE_SIZE
  return samplePixelBilinear(template.pixelData, fx, fy)
}

/**
 * 获取画布坐标对应的底稿颜色（最近邻采样 → 像素块风格）
 * 用于 40×40 画布填充，产生清晰可辨的像素块效果
 */
export function getTemplateColorNearest(
  canvasSize: number,
  x: number,
  y: number,
  template: PaintingTemplate
): string {
  const fx = Math.floor((x / canvasSize) * TEMPLATE_SIZE)
  const fy = Math.floor((y / canvasSize) * TEMPLATE_SIZE)
  return template.pixelData[fy][fx]
}

export interface PaintingTemplate {
  id: string
  title: string
  artist: string
  year: string
  pixelData: string[][] // TEMPLATE_SIZE × TEMPLATE_SIZE
}

// ============================================================
// 下方函数需要访问像素数据，仅在服务端导入 painting-pixels.ts 时有效
// 客户端不要直接调用 getPaintingsList()
// ============================================================

/** @internal 由 painting-pixels.ts 内部填充 */
let _paintingsList: Omit<PaintingTemplate, 'pixelData'>[] | null = null

/** @internal 设置列表（由 painting-pixels.ts 在模块初始化时调用） */
export function __setPaintingsList(list: Omit<PaintingTemplate, 'pixelData'>[]) {
  _paintingsList = list
}

/**
 * 获取名画列表元数据（不含像素数据，用于前端下拉选择器/API）
 * 需要服务端在模块初始化时调用 __setPaintingsList
 */
export function getPaintingsList(): Omit<PaintingTemplate, 'pixelData'>[] {
  if (!_paintingsList) {
    // 降级：尝试从 painting-pixels.ts 加载
    try {
      // dynamic import - will only work server-side
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const data = require('@/data/painting-pixels') as { FAMOUS_PAINTINGS: PaintingTemplate[] }
      _paintingsList = data.FAMOUS_PAINTINGS.map(({ id, title, artist, year }) => ({ id, title, artist, year }))
    } catch {
      _paintingsList = []
    }
  }
  return _paintingsList
}
