'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface ArchiveCanvas {
  id: string
  width: number
  height: number
  name: string | null
  startTime: string
  endTime: string
  pixelCount: number
  totalPixels: number
  fillRate: number
  ownerId: string | null
  topUsers: { userId: string; count: number }[]
}

interface PixelData {
  x: number; y: number; color: string; userId: string; placedAt: string
}

export default function CanvasGallery() {
  const [canvases, setCanvases] = useState<ArchiveCanvas[]>([])
  const [canvasPixelsMap, setCanvasPixelsMap] = useState<Map<string, {x: number; y: number; color: string}[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedCanvas, setSelectedCanvas] = useState<ArchiveCanvas | null>(null)
  const [selectedPixels, setSelectedPixels] = useState<PixelData[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [namingId, setNamingId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [nameMsg, setNameMsg] = useState('')

  const detailCanvasRef = useRef<HTMLCanvasElement>(null)
  const thumbRefs = useRef<Map<string, HTMLCanvasElement>>(new Map())

  // 登录状态
  useEffect(() => {
    setUserId(localStorage.getItem('userId'))
  }, [])

  // 获取历史列表
  useEffect(() => {
    fetch('/api/canvas/history')
      .then(r => r.json())
      .then(data => {
        const arr = data.canvases || data
        setCanvases(arr)
        const map = new Map<string, {x: number; y: number; color: string}[]>()
        for (const c of arr) {
          if (c.pixels) map.set(c.id, c.pixels)
        }
        setCanvasPixelsMap(map)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // 渲染缩略图
  const renderThumbnail = (c: ArchiveCanvas, canvasEl: HTMLCanvasElement | null) => {
    if (!canvasEl) return
    canvasEl.width = 240
    canvasEl.height = 240
    const ctx = canvasEl.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#111111'
    ctx.fillRect(0, 0, 240, 240)

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, 240, 240)

    // 网格信息
    ctx.fillStyle = 'rgba(0,0,0,0.05)'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(c.width + '×' + c.height, 120, 120)

    // 填充率进度
    const barY = 200
    ctx.fillStyle = 'rgba(0,0,0,0.06)'
    ctx.fillRect(20, barY, 200, 6)
    ctx.fillStyle = c.fillRate > 50 ? 'rgba(34,197,94,0.4)' : 'rgba(201,169,98,0.3)'
    ctx.fillRect(20, barY, (c.fillRate / 100) * 200, 6)

    ctx.fillStyle = '#999'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(c.pixelCount + ' px · ' + c.fillRate + '%', 120, 230)
  }

  // 打开详情
  const openDetail = (c: ArchiveCanvas) => {
    setSelectedCanvas(c)
    setSelectedPixels((canvasPixelsMap.get(c.id) || []) as PixelData[])
  }

  // 缩放画板的像素渲染
  useEffect(() => {
    if (!selectedCanvas || !detailCanvasRef.current || selectedPixels.length === 0) return
    const canvas = detailCanvasRef.current
    const container = canvas.parentElement
    if (!container) return

    const cw = container.clientWidth - 48
    const ch = container.clientHeight - 48
    const maxDim = Math.min(cw, ch, 480)
    const cellSize = Math.floor(maxDim / Math.max(selectedCanvas.width, selectedCanvas.height))
    const pixelDim = Math.max(1, cellSize)
    const totalW = selectedCanvas.width * pixelDim
    const totalH = selectedCanvas.height * pixelDim

    canvas.width = totalW
    canvas.height = totalH
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, totalW, totalH)

    for (const p of selectedPixels) {
      if (p.x < selectedCanvas.width && p.y < selectedCanvas.height) {
        ctx.fillStyle = p.color
        ctx.fillRect(p.x * pixelDim, p.y * pixelDim, pixelDim, pixelDim)
      }
    }

    // 网格（缩放大时才显示）
    if (pixelDim >= 4) {
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'
      ctx.lineWidth = 0.5
      for (let i = 0; i <= selectedCanvas.width; i++) {
        ctx.beginPath()
        ctx.moveTo(i * pixelDim, 0)
        ctx.lineTo(i * pixelDim, totalH)
        ctx.stroke()
      }
      for (let i = 0; i <= selectedCanvas.height; i++) {
        ctx.beginPath()
        ctx.moveTo(0, i * pixelDim)
        ctx.lineTo(totalW, i * pixelDim)
        ctx.stroke()
      }
    }
  }, [selectedCanvas, selectedPixels])

  // 命名画布
  const handleNameCanvas = async () => {
    if (!namingId || !nameInput.trim()) return
    setNameMsg('')
    try {
      const res = await fetch('/api/canvas/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvasId: namingId, name: nameInput.trim() }),
      })
      if (res.ok) {
        setSelectedCanvas(prev => prev ? { ...prev, name: nameInput.trim() } : prev)
        setCanvases(prev => prev.map(c => c.id === namingId ? { ...c, name: nameInput.trim() } : c))
        setNamingId(null)
        setNameInput('')
      } else {
        const d = await res.json()
        setNameMsg(d.error || '命名失败')
      }
    } catch {
      setNameMsg('网络错误')
    }
  }

  // 打开命名对话框
  const startNaming = () => {
    if (!selectedCanvas) return
    setNamingId(selectedCanvas.id)
    setNameInput(selectedCanvas.name || '')
    setNameMsg('')
  }

  // 时间格式化
  const fmtDate = (d: string) => {
    const dt = new Date(d)
    return dt.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="pt-24 pb-32 flex items-center justify-center min-h-screen">
        <div className="text-gray-500 animate-pulse">加载历史画布...</div>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-16 px-6 md:px-12 lg:px-24 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* 标题 */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-display text-3xl md:text-4xl text-white mb-2">历史画布</h1>
            <p className="text-sm text-gray-500">
              共 {canvases.length} 个已完成画布
            </p>
          </div>
          <Link href="/canvas" className="text-sm text-accent-gold/60 hover:text-accent-gold transition">
            &larr; 返回画板
          </Link>
        </div>

        {canvases.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            暂无归档画布。画板每24小时结算一次，到时会在这里展示历史作品。
          </div>
        )}

        {/* 画廊网格 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {canvases.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => openDetail(c)}
              className="border border-dark-700 rounded-sm overflow-hidden bg-dark-900/50 hover:border-dark-600 hover:bg-dark-900/80 transition-all cursor-pointer group"
            >
              {/* 缩略图预览 */}
              <div className="aspect-square bg-dark-800 relative overflow-hidden">
                <canvas
                  ref={el => { if (el) { thumbRefs.current.set(c.id, el); renderThumbnail(c, el) } }}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>

              {/* 信息 */}
              <div className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm text-white font-medium truncate max-w-[70%]">
                    {c.name || '画布 #' + c.id.slice(-6)}
                  </span>
                  <span className="text-xs text-gray-600 flex-shrink-0 ml-2">{c.width}&times;{c.height}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    {c.topUsers.length > 0 && (
                      <span className="text-accent-gold/50">
                        {c.topUsers[0].count}px
                      </span>
                    )}
                    <span className="text-gray-600">{c.endTime ? fmtDate(c.endTime) : ''}</span>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={'text-xs px-1.5 py-0.5 rounded-sm ' +
                      (c.fillRate > 80 ? 'text-green-400/60 bg-green-900/20' :
                       c.fillRate > 50 ? 'text-accent-gold/50 bg-accent-gold/10' :
                       'text-gray-600 bg-dark-800')
                    }>
                      {c.fillRate}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 详情弹窗 */}
        <AnimatePresence>
          {selectedCanvas && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCanvas(null)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-dark-900 border border-dark-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              >
                {/* 弹窗头部 */}
                <div className="p-5 md:p-6 border-b border-dark-700 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-display text-white">
                      {selectedCanvas.name || '画布 #' + selectedCanvas.id.slice(-6)}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedCanvas.width}&times;{selectedCanvas.height} &middot;
                      {selectedCanvas.pixelCount}/{selectedCanvas.totalPixels} 像素 &middot;
                      填充率 {selectedCanvas.fillRate}%
                    </p>
                  </div>
                  <button onClick={() => setSelectedCanvas(null)}
                    className="text-gray-500 hover:text-white text-2xl leading-none ml-4">&times;</button>
                </div>

                {/* 像素预览 */}
                <div className="p-5 md:p-6 flex justify-center bg-dark-950 min-h-[200px] items-center">
                  {loadingDetail ? (
                    <div className="text-gray-500 text-sm animate-pulse">加载像素数据...</div>
                  ) : selectedPixels.length === 0 ? (
                    <div className="text-gray-600 text-sm">空画布（无像素数据）</div>
                  ) : (
                    <div className="overflow-auto max-w-full">
                      <canvas ref={detailCanvasRef}
                        className="border border-dark-700 rounded-sm max-w-full"
                        style={{ imageRendering: 'pixelated' }} />
                    </div>
                  )}
                </div>

                {/* 统计信息 */}
                <div className="px-5 md:px-6 pb-5 md:pb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    <div className="bg-dark-800 border border-dark-700 rounded-sm p-3">
                      <div className="text-xs text-gray-600 mb-1">创建时间</div>
                      <div className="text-sm text-gray-300">{fmtDate(selectedCanvas.startTime)}</div>
                    </div>
                    <div className="bg-dark-800 border border-dark-700 rounded-sm p-3">
                      <div className="text-xs text-gray-600 mb-1">结算时间</div>
                      <div className="text-sm text-gray-300">{fmtDate(selectedCanvas.endTime)}</div>
                    </div>
                    <div className="bg-dark-800 border border-dark-700 rounded-sm p-3">
                      <div className="text-xs text-gray-600 mb-1">像素总数</div>
                      <div className="text-sm text-gray-300">{selectedCanvas.pixelCount}</div>
                    </div>
                    <div className="bg-dark-800 border border-dark-700 rounded-sm p-3">
                      <div className="text-xs text-gray-600 mb-1">填充率</div>
                      <div className="text-sm text-gray-300">{selectedCanvas.fillRate}%</div>
                    </div>
                  </div>

                  {selectedCanvas.topUsers.length > 0 && (
                    <div className="mt-4 bg-dark-800 border border-dark-700 rounded-sm p-3">
                      <div className="text-xs text-gray-600 mb-2">贡献排名</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedCanvas.topUsers.slice(0, 10).map((u, i) => (
                          <div key={u.userId}
                            className={'flex items-center gap-1.5 bg-dark-900/50 rounded-sm px-2 py-1 text-xs ' +
                              (i === 0 ? 'text-accent-gold/80' : 'text-gray-400')}>
                            {i === 0 && <span className="text-[10px]">{'\uD83C\uDFC6'}</span>}
                            <span>{u.userId.slice(-8)}</span>
                            <span className="text-gray-600">{u.count}px</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 底部操作 */}
                  <div className="mt-4 flex items-center justify-end gap-3">
                    <button onClick={() => setSelectedCanvas(null)}
                      className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 border border-dark-600 rounded-sm transition">
                      关闭
                    </button>
                    {selectedCanvas.ownerId && selectedCanvas.ownerId === userId && (
                      <button onClick={startNaming}
                        className="text-xs text-accent-gold/60 hover:text-accent-gold px-3 py-1.5 border border-accent-gold/30 rounded-sm transition">
                        画布命名
                      </button>
                    )}
                  </div>
                </div>
              {/* 命名对话框 */}
              {namingId && (
                <div className="px-5 md:px-6 pb-5 md:pb-6">
                  <div className="bg-dark-800 border border-dark-700 rounded-sm p-4">
                    <div className="text-sm text-gray-300 mb-2">为画布命名</div>
                    <div className="flex items-center gap-2">
                      <input
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        placeholder="输入画布名称..."
                        maxLength={50}
                        className="flex-1 bg-dark-950 text-sm text-white border border-dark-600 rounded-sm px-3 py-1.5 focus:outline-none focus:border-accent-gold/50"
                        onKeyDown={e => e.key === 'Enter' && handleNameCanvas()}
                      />
                      <button onClick={handleNameCanvas}
                        className="text-xs text-accent-gold bg-accent-gold/10 hover:bg-accent-gold/20 px-3 py-1.5 rounded-sm transition">
                        确认
                      </button>
                      <button onClick={() => setNamingId(null)}
                        className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded-sm transition">
                        取消
                      </button>
                    </div>
                    {nameMsg && <div className="text-xs text-red-400 mt-2">{nameMsg}</div>}
                  </div>
                </div>
              )}

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
