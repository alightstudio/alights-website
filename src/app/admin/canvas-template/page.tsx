'use client'

import { useEffect, useState, useRef } from 'react'
import { FAMOUS_PAINTINGS, TEMPLATE_SIZE, PaintingTemplate } from '@/lib/famous-paintings'

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

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const res = await fetch('/api/admin/canvas-template')
      const data = await res.json()
      setPaintings(data.paintings || [])
      setCurrent(data.current || 'starry-night')
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
          选择画布自动填充时使用的名画底稿。填充时 100% 由底稿引导（位置+颜色均来自底稿），画面更协调。
          画布尺寸：{TEMPLATE_SIZE}×{TEMPLATE_SIZE}（共 {TEMPLATE_SIZE * TEMPLATE_SIZE} 格）。
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          {paintings.map(p => (
            <PaintingCard
              key={p.id}
              painting={p}
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

// ─── 单张画卡（含像素预览） ───

function PaintingCard({ painting, isSelected, onClick }: {
  painting: PaintingItem
  isSelected: boolean
  onClick: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // 通过 id 找到完整像素数据
    const full = FAMOUS_PAINTINGS.find(p => p.id === painting.id)
    if (!full || !canvasRef.current) return

    const cvs = canvasRef.current
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    const size = full.pixelData.length
    const cellSize = cvs.width / size

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = full.pixelData[y][x]
        ctx.fillRect(x * cellSize, y * cellSize, Math.ceil(cellSize), Math.ceil(cellSize))
      }
    }
  }, [painting.id])

  return (
    <div
      className={`border p-3 rounded cursor-pointer transition-all ${
        isSelected
          ? 'border-white bg-gray-900 ring-1 ring-white'
          : 'border-gray-700 hover:border-gray-500 hover:bg-gray-900/50'
      }`}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        width={160}
        height={160}
        className="w-full aspect-square rounded mb-2 block"
        style={{ imageRendering: 'pixelated' }}
      />
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
