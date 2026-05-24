'use client'

import { Suspense, useCallback, useEffect, useState, Component } from 'react'
import Spline from '@splinetool/react-spline/next'
import Link from 'next/link'

// ══ 错误边界：捕获 Spline 渲染时的 React 异常 ══
class SplineErrorBoundary extends Component<{
  fallback: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  children?: React.ReactNode
}> {
  state: { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null } = { hasError: false, error: null, errorInfo: null }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Spirit] SplineErrorBoundary caught:', error.message, errorInfo)
    this.setState({ error, errorInfo })
    this.props.onError?.(error, errorInfo)
    // 将错误信息暴露到 window，方便调试
    ;(window as any).__splineLastError = { message: error.message, stack: error.stack, componentStack: errorInfo.componentStack }
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
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
  const [splineKey, setSplineKey] = useState(0)
  const [splineReady, setSplineReady] = useState(false)

  // 客户端挂载后设置
  useEffect(() => {
    setMounted(true)
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth * 1.2)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const onSplineLoad = useCallback((splineApp: any) => {
    setSplineReady(true)
    try { splineApp.setBackgroundColor('transparent') } catch {}
    ;(window as any).__splineApp = splineApp
  }, [])

  const handleRetry = useCallback(() => {
    setSplineReady(false)
    setSplineKey(k => k + 1)
  }, [])

  // 组件卸载时释放 Spline Application 防止 WebGL 资源泄漏
  useEffect(() => {
    return () => {
      const app = (window as any).__splineApp
      if (app) {
        try { app.dispose() } catch {}
        delete (window as any).__splineApp
      }
    }
  }, [])

  const fallback = (
    <div className={`w-full touch-none max-h-full ${isPortrait ? 'h-[55dvh]' : 'h-full'} flex items-center justify-center`}>
      <div className="text-center max-w-md px-4">
        <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-violet-500/5 flex items-center justify-center">
          <svg className="w-4 h-4 text-violet-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm text-gray-400/80 mb-3">场景加载失败</p>
        {typeof window !== 'undefined' && (window as any).__splineLastError && (
          <pre className="text-[10px] text-red-400/60 text-left whitespace-pre-wrap mb-3 max-h-32 overflow-auto">
            {(window as any).__splineLastError.message}
          </pre>
        )}
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
        <SplineErrorBoundary fallback={fallback} onError={() => { setSplineReady(false) }}>
          <div className={`w-full touch-none max-h-full ${isPortrait ? 'h-[55dvh]' : 'h-full'}`}>
            {!splineReady && <LoadingSkeleton isPortrait={isPortrait} />}
            {mounted && (
              <Spline
                key={splineKey}
                scene="/scenes/spirit-scene.splinecode"
                className="w-full h-full"
                onLoad={onSplineLoad}
              />
            )}
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
