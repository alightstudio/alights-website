'use client'

import { useEffect, useState, useRef } from 'react'

export const dynamic = 'force-dynamic'

interface PaintingItem {
  id: string
  title: string
  artist: string
  year: string
}

export default function CanvasTemplateAdmin() {
  const [paintings, setPaintings] = useState<PaintingItem[]>([])
  const [current, setCurrent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [thumbMap, setThumbMap] = useState<Map<string, string[][]>>(new Map())

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [tmplRes, thumbRes] = await Promise.all([
        fetch('/api/admin/canvas-template'),
        fetch('/api/admin/canvas-template/thumbnails'),
      ])
      const tmplData = await tmplRes.json()
      const thumbData = await thumbRes.json()
      setPaintings(tmplData.paintings || [])
      setCurrent(tmplData.current || 'starry-night')
      setTotal(tmplData.paintings?.length || 0)
      if (thumbData.thumbnails) {
        const map: Map<string, string[][]> = new Map()
        for (const t of thumbData.thumbnails as any[]) {
          map.set(t.id, t.grid)
        }
        setThumbMap(map)
      }
    } catch (e) {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  async function saveTemplate() {
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/admin/canvas-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: current })
      })

      if (!res.ok) throw new Error('保存失败')
      alert('保存成功！新的底稿将在下次随机填充时生效')
    } catch (e) {
      setError('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-white">加载中...</div>

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-light mb-8">画布底稿管理</h1>

      {error && (
        <div className="bg-red-900 text-white p-4 rounded mb-6">{error}</div>
      )}

      <div className="max-w-6xl">
        <p className="text-gray-400 mb-6">
          选择画布自动填充时使用的名画底稿。每次自动填充时，严格按底稿坐标（位置+颜色）引导，100% 循底稿，无随机色彩。
          画布尺寸：40×40 → 80×80（满格自动扩展）。名画库共 {total} 幅，每天自动随机切换。
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          {paintings.map(p => (
            <PaintingCard
              key={p.id}
              painting={p}
              thumbGrid={thumbMap.get(p.id)}
              isSelected={current === p.id}
              onClick={() => setCurrent(p.id)}
            />
          ))}
        </div>

        <button
          onClick={saveTemplate}
          disabled={saving}
          className="bg-white text-black px-6 py-3 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>

        <div className="mt-8 p-4 bg-gray-900 rounded">
          <h3 className="font-medium mb-2">当前底稿</h3>
          <p className="text-gray-400">
            {paintings.find(p => p.id === current)?.title || '未知'}
            {' — '}
            {paintings.find(p => p.id === current)?.artist}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── 单张画卡（含真实像素缩略图） ───

function PaintingCard({ painting, thumbGrid, isSelected, onClick }: {
  painting: PaintingItem
  thumbGrid?: string[][]
  isSelected: boolean
  onClick: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 绘制 80×80 缩略图到 canvas（160×160 物理像素，每格 2px）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !thumbGrid) return
    const size = thumbGrid.length  // 80
    canvas.width = size * 2  // 160
    canvas.height = size * 2 // 160
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const cellSize = 2  // 每格 2 物理像素
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = thumbGrid[y]?.[x] ?? '#000'
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
    }
  }, [thumbGrid])

  return (
    <div
      className={`border p-3 rounded cursor-pointer transition-all ${
        isSelected
          ? 'border-white bg-gray-900 ring-1 ring-white'
          : 'border-gray-700 hover:border-gray-500 hover:bg-gray-900/50'
      }`}
      onClick={onClick}
    >
      {/* 像素缩略图 */}
      <div className="w-full aspect-square rounded mb-2 overflow-hidden bg-black/40">
        {thumbGrid ? (
          <canvas
            ref={canvasRef}
            width={80}
            height={80}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs animate-pulse">
            加载中...
          </div>
        )}
      </div>

      <h3 className="font-medium text-sm truncate">{painting.title}</h3>
      <p className="text-xs text-gray-400 truncate">{painting.artist}（{painting.year}）</p>
      {isSelected && (
        <span className="inline-block mt-1 text-[10px] bg-white text-black px-1.5 py-0.5 rounded">
          当前选中
        </span>
      )}
    </div>
  )
}
