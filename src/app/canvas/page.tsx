'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import CanvasLeaderboard from '@/components/CanvasLeaderboard'
import CanvasMarketplace from '@/components/CanvasMarketplace'

const BASE_COLORS = [
  { name: '白', hex: '#FFFFFF' },
  { name: '黑', hex: '#000000' },
  { name: '红', hex: '#FF0000' },
  { name: '绿', hex: '#00FF00' },
  { name: '黄', hex: '#FFFF00' },
  { name: '蓝', hex: '#0000FF' },
  { name: '紫', hex: '#800080' },
  { name: '灰', hex: '#808080' },
  { name: '棕', hex: '#A52A2A' },
  { name: '褐', hex: '#D2B48C' },
  { name: '青', hex: '#00FFFF' },
]

const CELL_BASE = 20

interface CanvasInfo {
  id: string
  width: number
  height: number
  startTime: string
  remainingMs: number
  fillRate: number
  totalPixels: number
  placedPixels: number
  leader: { userId: string; count: number } | null
}

interface PixelInfo {
  userId: string
  placedAt: string
}

export default function CanvasPage() {
  const [tab, setTab] = useState<'canvas' | 'leaderboard' | 'marketplace'>('canvas')
  const [canvasInfo, setCanvasInfo] = useState<CanvasInfo | null>(null)
  const [pixelMap, setPixelMap] = useState<Map<string, string>>(new Map())
  const [pixelMeta, setPixelMeta] = useState<Map<string, PixelInfo>>(new Map())
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userPoints, setUserPoints] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const [placedPixel, setPlacedPixel] = useState<{ x: number; y: number } | null>(null)
  const [countdown, setCountdown] = useState('--:--:--')
  const [randomCountdown, setRandomCountdown] = useState('--:--')
  const [lastRandomChangeAt, setLastRandomChangeAt] = useState<number>(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [startTimeRef, setStartTimeRef] = useState(0)
  const [pixelInfo, setPixelInfo] = useState<{ x: number; y: number; color: string; info: PixelInfo } | null>(null)
  const [pixelInfoPos, setPixelInfoPos] = useState({ x: 0, y: 0 })
  const [recentColors, setRecentColors] = useState<string[]>([])
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const lastCanvasId = useRef<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(2)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const wheelTimeoutRef = useRef<number>(0)
  const infoTimeoutRef = useRef<number>(0)

  // 登录状态
  useEffect(() => {
    const uid = localStorage.getItem('userId')
    if (uid) {
      setUserId(uid)
      setIsLoggedIn(true)
    }
  }, [])

  // 获取积分
  useEffect(() => {
    if (!isLoggedIn) return
    fetch('/api/points').then(r => r.json()).then(d => {
      setUserPoints(d.totalPoints || 0)
    }).catch(() => {})
  }, [isLoggedIn])

  // 获取画布数据
  const fetchCanvas = useCallback(async () => {
    try {
      const res = await fetch('/api/canvas/current')
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      if (data.canvas) {
        // 检测画布扩张（canvas ID 变化）
        if (lastCanvasId.current && lastCanvasId.current !== data.canvas.id) {
          setToastMsg('🎉 画布已填满！已自动扩张至 ' + data.canvas.width + '×' + data.canvas.height)
          setZoom(2)
          setOffset({ x: 0, y: 0 })
          setTimeout(() => setToastMsg(null), 5000)
        }
        lastCanvasId.current = data.canvas.id

        setCanvasInfo(data.canvas)
        setStartTimeRef(new Date(data.canvas.startTime).getTime())
        if (data.canvas.lastRandomChangeAt) {
          setLastRandomChangeAt(new Date(data.canvas.lastRandomChangeAt).getTime())
        } else {
          setLastRandomChangeAt(data.canvas.startTime ? new Date(data.canvas.startTime).getTime() : Date.now())
        }
        const map = new Map<string, string>()
        const meta = new Map<string, PixelInfo>()
        for (const p of data.pixels) {
          map.set(p.x + ',' + p.y, p.color)
          meta.set(p.x + ',' + p.y, { userId: p.userId, placedAt: p.placedAt })
        }
        setPixelMap(map)
        setPixelMeta(meta)
      }
    } catch (e) {
      console.error('获取画布失败:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCanvas() }, [fetchCanvas])
  useEffect(() => {
    const iv = setInterval(fetchCanvas, 5000)
    return () => clearInterval(iv)
  }, [fetchCanvas])

  // 每10分钟触发一次随机变色（客户端驱动，API 端防重）
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        await fetch('/api/cron/random-pixel', { method: 'POST' })
        fetchCanvas()
      } catch {}
    }, 10 * 60 * 1000)
    return () => clearInterval(iv)
  }, [fetchCanvas])

  // 画布周期倒计时
  useEffect(() => {
    if (!startTimeRef) return
    const tick = () => {
      const elapsed = Date.now() - startTimeRef
      const remain = Math.max(0, 24 * 60 * 60 * 1000 - elapsed)
      const h = Math.floor(remain / 3600000)
      const m = Math.floor((remain % 3600000) / 60000)
      const s = Math.floor((remain % 60000) / 1000)
      setCountdown(h + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0'))
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [startTimeRef])

  // 随机变色倒计时（每10分钟）
  useEffect(() => {
    if (!lastRandomChangeAt) return
    const tick = () => {
      const elapsed = Date.now() - lastRandomChangeAt
      const interval = 10 * 60 * 1000
      const remain = Math.max(0, interval - elapsed)
      const m = Math.floor(remain / 60000)
      const s = Math.floor((remain % 60000) / 1000)
      setRandomCountdown(m + ':' + s.toString().padStart(2, '0'))
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [lastRandomChangeAt])

  // Canvas 渲染
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvasInfo) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cellSize = CELL_BASE * zoom
    const canvasW = canvasInfo.width * cellSize
    const canvasH = canvasInfo.height * cellSize
    const container = containerRef.current
    canvas.width = container ? container.clientWidth : 800
    canvas.height = container ? container.clientHeight : 600

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(offset.x, offset.y)

    // 画布背景
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvasW, canvasH)

    // 绘制像素
    pixelMap.forEach((color, key) => {
      const sep = key.indexOf(',')
      const px = parseInt(key.substring(0, sep))
      const py = parseInt(key.substring(sep + 1))
      ctx.fillStyle = color
      ctx.fillRect(px * cellSize, py * cellSize, cellSize, cellSize)
    })

    // 网格线
    if (zoom >= 0.8) {
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth = 0.5
      for (let i = 0; i <= canvasInfo.width; i++) {
        ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, canvasH); ctx.stroke()
      }
      for (let i = 0; i <= canvasInfo.height; i++) {
        ctx.beginPath(); ctx.moveTo(0, i * cellSize); ctx.lineTo(canvasW, i * cellSize); ctx.stroke()
      }
    }

    // 刚刚放置的像素高亮
    if (placedPixel) {
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 3
      ctx.strokeRect(placedPixel.x * cellSize, placedPixel.y * cellSize, cellSize, cellSize)
    }

    // 悬停预览
    if (hoverPos && zoom >= 1.5) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.fillRect(hoverPos.x * cellSize, hoverPos.y * cellSize, cellSize, cellSize)
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(hoverPos.x * cellSize, hoverPos.y * cellSize, cellSize, cellSize)
    }

    ctx.restore()
  }, [canvasInfo, pixelMap, zoom, offset, hoverPos, placedPixel])

  useEffect(() => {
    const frame = requestAnimationFrame(renderCanvas)
    return () => cancelAnimationFrame(frame)
  }, [renderCanvas])

  // 放置像素高亮重置
  useEffect(() => {
    if (!placedPixel) return
    const t = setTimeout(() => setPlacedPixel(null), 1500)
    return () => clearTimeout(t)
  }, [placedPixel])

  // 屏幕坐标 -> 逻辑坐标
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || !canvasInfo) return null
    const cellSize = CELL_BASE * zoom
    const x = Math.floor((screenX - rect.left - offset.x) / cellSize)
    const y = Math.floor((screenY - rect.top - offset.y) / cellSize)
    if (x < 0 || x >= canvasInfo.width || y < 0 || y >= canvasInfo.height) return null
    return { x, y }
  }, [canvasInfo, zoom, offset])

  // 鼠标事件
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true)
      panStartRef.current = { x: e.clientX, y: e.clientY }
      e.preventDefault()
      return
    }
    if (e.button === 0 && !e.shiftKey) {
      const pos = screenToCanvas(e.clientX, e.clientY)
      if (pos) placePixel(pos.x, pos.y)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      setOffset(o => ({ x: o.x + dx, y: o.y + dy }))
      panStartRef.current = { x: e.clientX, y: e.clientY }
      return
    }
    const pos = screenToCanvas(e.clientX, e.clientY)
    setHoverPos(pos)

    // 显示像素信息弹窗（延迟）
    if (pos && zoom >= 2) {
      const key = pos.x + ',' + pos.y
      const meta = pixelMeta.get(key)
      const color = pixelMap.get(key)
      if (meta && color) {
        clearTimeout(infoTimeoutRef.current)
        infoTimeoutRef.current = window.setTimeout(() => {
          setPixelInfo({ x: pos.x!, y: pos.y!, color, info: meta })
          setPixelInfoPos({ x: e.clientX, y: e.clientY })
        }, 400)
      } else {
        clearTimeout(infoTimeoutRef.current)
        setPixelInfo(null)
      }
    } else {
      clearTimeout(infoTimeoutRef.current)
      setPixelInfo(null)
    }
  }

  const handleMouseLeave = () => {
    setIsPanning(false)
    setHoverPos(null)
    clearTimeout(infoTimeoutRef.current)
    setPixelInfo(null)
  }

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const pos = screenToCanvas(e.clientX, e.clientY)
    if (!pos) return
    const key = pos.x + ',' + pos.y
    const color = pixelMap.get(key)
    if (!color) return
    setSelectedColor(color)
    // 添加到最近使用
    setRecentColors(prev => {
      const next = [color, ...prev.filter(c => c !== color)]
      return next.slice(0, 6)
    })
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    clearTimeout(wheelTimeoutRef.current)
    wheelTimeoutRef.current = window.setTimeout(() => {
      const delta = e.deltaY > 0 ? -0.3 : 0.3
      const newZoom = Math.max(0.5, Math.min(10, zoom + delta))
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const ratio = newZoom / zoom
        setOffset({ x: mx - (mx - offset.x) * ratio, y: my - (my - offset.y) * ratio })
      }
      setZoom(newZoom)
    }, 10)
  }

  // 放置像素
  const placePixel = async (x: number, y: number) => {
    if (!canvasInfo || !isLoggedIn || placing) return
    setErrorMsg('')
    const key = x + ',' + y
    const currentColor = pixelMap.get(key)
    if (currentColor === selectedColor) return

    setPlacing(true)
    if (selectedColor !== '#FFFFFF') {
      setPlacedPixel({ x, y })
    }

    // 乐观更新
    setPixelMap(prev => { const m = new Map(prev); m.set(key, selectedColor); return m })
    setPixelMeta(prev => {
      const m = new Map(prev)
      m.set(key, { userId: userId || '', placedAt: new Date().toISOString() })
      return m
    })
    setUserPoints(p => Math.max(0, p - 1))

    try {
      const res = await fetch('/api/canvas/pixel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvasId: canvasInfo.id, x, y, color: selectedColor }),
      })
      if (!res.ok) {
        const data = await res.json()
        setPixelMap(prev => {
          const m = new Map(prev)
          if (currentColor) m.set(key, currentColor)
          else m.delete(key)
          return m
        })
        setPixelMeta(prev => {
          const m = new Map(prev)
          if (currentColor) m.delete(key)
          return m
        })
        setUserPoints(p => p + 1)
        setErrorMsg(data.error || '放置失败')
      } else {
        const data = await res.json()
        setUserPoints(data.pointsRemaining)
      }
    } catch {
      setPixelMap(prev => { const m = new Map(prev); if (currentColor) m.set(key, currentColor); else m.delete(key); return m })
      setPixelMeta(prev => { const m = new Map(prev); if (currentColor) m.delete(key); return m })
      setUserPoints(p => p + 1)
      setErrorMsg('网络错误')
    } finally {
      setPlacing(false)
    }
  }

  if (loading) {
    return (
      <div className="pt-24 pb-32 flex items-center justify-center min-h-screen">
        <div className="text-gray-500">加载画布中...</div>
      </div>
    )
  }

  return (
    <div className="pt-20 pb-8 min-h-screen flex flex-col bg-dark-950">
      {/* 扩张通知 */}
      {toastMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-accent-gold/90 text-dark-900 rounded-lg shadow-lg text-sm font-medium animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* Tab 导航 */}
      <div className="px-6 md:px-12 mb-3">
        <div className="flex items-center space-x-6 border-b border-dark-800">
          <button onClick={() => setTab('canvas')}
            className={`py-3 text-sm tracking-wide transition-colors border-b-2 ${tab === 'canvas' ? 'text-white border-accent-gold' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >🎨 像素画布</button>
          <button onClick={() => setTab('leaderboard')}
            className={`py-3 text-sm tracking-wide transition-colors border-b-2 ${tab === 'leaderboard' ? 'text-white border-accent-gold' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >🏆 排行榜</button>
          <button onClick={() => setTab('marketplace')}
            className={`py-3 text-sm tracking-wide transition-colors border-b-2 ${tab === 'marketplace' ? 'text-white border-accent-gold' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >🛒 市场</button>
        </div>
      </div>

      {/* 画板 Tab */}
      {tab === 'canvas' && (<>
      {/* 顶部信息栏 */}
      <div className="px-6 md:px-12 mb-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl text-white">像素画布</h1>
          <p className="text-xs text-gray-500 mt-1">
            {canvasInfo ? canvasInfo.width + '\u00D7' + canvasInfo.height : '--'} {'\u00B7'}
            已填充 <span className="text-green-400/70">{canvasInfo ? canvasInfo.fillRate + '%' : '--'}</span> {'\u00B7'}
            {(canvasInfo && canvasInfo.remainingMs > 0)
              ? <>结算 <span className="text-accent-gold/70">{countdown}</span></>
              : <span className="text-red-400">结算中...</span>
            }
            {' \u00B7 '}
            随机变色 <span className="text-purple-400/70">{randomCountdown}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {canvasInfo && canvasInfo.leader && (
            <span className="text-gray-500">
              领先: <span className="text-accent-gold/70">{canvasInfo.leader.count}px</span>
            </span>
          )}
          {isLoggedIn ? (
            <span className="text-gray-400">
              {'\u2726'} <span className="text-accent-gold/70">{userPoints}</span>
            </span>
          ) : (
            <a href="/login" className="text-accent-gold/60 hover:underline text-xs">登录后作画</a>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {errorMsg && (
        <div className="px-6 md:px-12 mb-2">
          <div className="text-xs text-red-400 bg-red-900/30 px-3 py-1.5 rounded inline-block">{errorMsg}</div>
        </div>
      )}

      {/* 颜色选择 */}
      <div className="px-6 md:px-12 mb-3 flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-gray-600 mr-1">颜色:</span>
        {BASE_COLORS.map(c => (
          <button key={c.hex} onClick={() => setSelectedColor(c.hex)}
            className={'w-7 h-7 rounded-sm border transition-all ' + (selectedColor === c.hex ? 'border-accent-gold scale-125 z-10' : 'border-dark-600 hover:border-gray-500')}
            style={{ backgroundColor: c.hex, boxShadow: selectedColor === c.hex ? '0 0 8px rgba(201,169,98,0.5)' : 'none' }}
            title={c.name + ' | 右键像素取色'}
          />
        ))}
        {recentColors.length > 0 && (
          <>
            <span className="text-xs text-gray-600 mx-1">|</span>
            <span className="text-xs text-gray-600 mr-1">最近:</span>
            {recentColors.map(c => (
              <button key={c} onClick={() => setSelectedColor(c)}
                className={'w-6 h-6 rounded-sm border transition-all ' + (selectedColor === c ? 'border-accent-gold scale-125 z-10' : 'border-dark-600 hover:border-gray-500')}
                style={{ backgroundColor: c }}
              />
            ))}
          </>
        )}
      </div>

      {/* Canvas */}
      <div ref={containerRef}
        className="flex-1 mx-6 md:mx-12 border border-dark-700 overflow-hidden relative bg-dark-900 rounded-sm"
        style={{ minHeight: '460px', cursor: isPanning ? 'grabbing' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsPanning(false)}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={handleRightClick}
      >
        <canvas ref={canvasRef} className="w-full h-full" />

        {/* 像素信息弹窗 */}
        {pixelInfo && (() => {
          const timeAgo = (() => {
            const diff = Date.now() - new Date(pixelInfo.info.placedAt).getTime()
            if (diff < 60000) return Math.floor(diff / 1000) + '秒前'
            if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
            return Math.floor(diff / 3600000) + '小时前'
          })()
          return (
            <div className="absolute z-50 pointer-events-none"
              style={{
                left: Math.min(pixelInfoPos.x + 12, (containerRef.current?.clientWidth || 800) - 220),
                top: Math.max(pixelInfoPos.y - 10, 0),
              }}
            >
              <div className="bg-dark-800 border border-white/10 rounded-lg px-3 py-2 shadow-xl text-xs"
                style={{ minWidth: '150px' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-4 h-4 rounded-sm block border border-white/20 flex-shrink-0"
                    style={{ backgroundColor: pixelInfo.color }} />
                  <span className="text-gray-300 font-mono">{pixelInfo.color}</span>
                </div>
                <div className="text-gray-500">
                  位置: ({pixelInfo.x}, {pixelInfo.y})
                </div>
                <div className="text-gray-500">
                  用户: <span className="text-gray-400">{pixelInfo.info.userId.slice(-8)}</span>
                </div>
                <div className="text-gray-500">
                  时间: {timeAgo}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* 提示 */}
      <div className="px-6 md:px-12 mt-3 flex items-center gap-4 text-xs text-gray-600">
        <span>{'\uD83D\uDDB1'} 点击像素</span>
        <span>{'\u21E7'}+拖拽 平移</span>
        <span>滚轮 缩放</span>
        <span>右键 取色</span>
        <span>1像素 = 1积分</span>
      </div>

      {/* 历史作品链接 */}
      <div className="px-6 md:px-12 mt-4">
        <a href="/canvas/gallery" className="text-xs text-gray-600 hover:text-accent-gold/60 transition">
          查看历史作品 &rarr;
        </a>
      </div>
      </>)}

      {/* 排行榜 Tab */}
      {tab === 'leaderboard' && (
        <div className="flex-1 px-6 md:px-12">
          <CanvasLeaderboard />
        </div>
      )}

      {/* 市场 Tab */}
      {tab === 'marketplace' && (
        <div className="flex-1 px-6 md:px-12">
          <CanvasMarketplace userId={userId} points={userPoints} />
        </div>
      )}
    </div>
  )
}
