'use client'

import { useCallback, useEffect, useRef, useState, Component } from 'react'
import Link from 'next/link'

// ══ 错误边界 ══
class SplineErrorBoundary extends Component<{
  fallback: React.ReactNode
  onError?: () => void
  children?: React.ReactNode
}> {
  state: { hasError: boolean } = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    console.error('[Spirit] SplineErrorBoundary caught:', error.message)
    this.props.onError?.()
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

// ══ Loading 骨架 ══
function LoadingSkeleton({ isPortrait }: { isPortrait: boolean }) {
  return (
    <div className={`w-full touch-none max-h-full ${isPortrait ? 'h-[55dvh]' : 'h-full'} flex items-center justify-center`}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 border border-violet-400/30 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] text-gray-600 tracking-widest uppercase">Loading</p>
      </div>
    </div>
  )
}

export default function SpiritPage() {
  const [isPortrait, setIsPortrait] = useState(false)
  const [mounted, setMounted] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<any>(null)

  // 客户端挂载
  useEffect(() => {
    setMounted(true)
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth * 1.2)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // 用原生 Runtime API 加载 Spline，彻底绕过 React 组件渲染
  useEffect(() => {
    if (!mounted || !canvasRef.current) return

    let cancelled = false

    const loadSpline = async () => {
      const { Application } = await import('@splinetool/runtime')
      if (cancelled) return

      const app = new Application(canvasRef.current!)
      appRef.current = app
      ;(window as any).__splineApp = app

      // 先 fetch 为 ArrayBuffer 再传入 start()
      const res = await fetch('/scenes/spirit-scene.splinecode')
      const buffer = await res.arrayBuffer()
      if (cancelled) return

      await app.start(buffer)
    }

    loadSpline().catch((err) => {
      console.error('[Spirit] Spline runtime load failed:', err)
    })

    return () => {
      cancelled = true
      if (appRef.current) {
        try { appRef.current.dispose() } catch {}
        appRef.current = null
        delete (window as any).__splineApp
      }
    }
  }, [mounted])

  const handleRetry = useCallback(() => {
    // 销毁旧实例
    if (appRef.current) {
      try { appRef.current.dispose() } catch {}
      appRef.current = null
    }
    // 重新触发 useEffect
    setMounted(false)
    setTimeout(() => setMounted(true), 0)
  }, [])

  const fallback = (
    <div className={`w-full touch-none max-h-full ${isPortrait ? 'h-[55dvh]' : 'h-full'} flex items-center justify-center`}>
      <div className="text-center">
        <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-violet-500/5 flex items-center justify-center">
          <svg className="w-4 h-4 text-violet-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm text-gray-400/80 mb-3">场景加载失败</p>
        <button
          onClick={handleRetry}
          className="px-5 py-1.5 text-xs text-gray-500 border border-white/10 rounded-full hover:border-violet-400/40 hover:text-white transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-dark-950 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <SplineErrorBoundary fallback={fallback}>
          <div className={`w-full touch-none max-h-full ${isPortrait ? 'h-[55dvh]' : 'h-full'} relative`}>
            <LoadingSkeleton isPortrait={isPortrait} />
            {mounted && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}
          </div>
        </SplineErrorBoundary>
        {/* 水印遮罩 */}
        <div className="absolute bottom-0 right-0 w-36 h-12 z-40 bg-dark-950" />
        <div className="absolute bottom-0 left-0 right-0 h-8 z-40 bg-gradient-to-b from-transparent to-dark-950 pointer-events-none" />
        <div className="absolute top-0 right-0 w-8 h-full z-40 bg-gradient-to-l from-dark-950 to-transparent pointer-events-none" />
      </div>

      <Link
        href="/lab"
        className="fixed top-4 left-4 z-50 group flex items-center gap-1.5 px-3 py-1.5 bg-dark-900/70 backdrop-blur-sm border border-white/5 rounded-full hover:border-violet-400/30 transition-all duration-300"
      >
        <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-[11px] text-gray-500 group-hover:text-white tracking-wider">返回</span>
      </Link>

      <div className="fixed bottom-6 left-4 z-50 max-w-xs">
        <div className="inline-block bg-dark-950/60 backdrop-blur-sm px-3.5 py-2.5 rounded-lg border border-white/5">
          <div className="w-6 h-px bg-violet-400/50 mb-1.5" />
          <h1 className="text-lg text-white font-light tracking-wider">光灵</h1>
          <p className="text-[9px] text-violet-400/70 tracking-[0.2em] uppercase">Light Spirit</p>
        </div>
      </div>
    </div>
  )
}
