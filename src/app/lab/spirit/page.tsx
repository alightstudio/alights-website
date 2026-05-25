'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Script from 'next/script'

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

// ══ 错误提示 ══
function ErrorFallback({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className={`w-full touch-none max-h-full flex items-center justify-center`}>
      <div className="text-center max-w-md px-4">
        <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-violet-500/5 flex items-center justify-center">
          <svg className="w-4 h-4 text-violet-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm text-gray-400/80 mb-2">场景加载失败</p>
        {msg && (
          <p className="text-[10px] text-gray-600 mb-3 max-w-xs mx-auto">{msg}</p>
        )}
        <button
          onClick={onRetry}
          className="px-5 py-1.5 text-xs text-gray-500 border border-white/10 rounded-full hover:border-violet-400/40 hover:text-white transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  )
}

export default function SpiritPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPortrait, setIsPortrait] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth * 1.2)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // 加载 Spline 场景
  useEffect(() => {
    if (!mounted || !canvasRef.current) return

    let disposed = false
    let app: any = null

    async function loadScene() {
      setLoadState('loading')
      setErrorMsg('')
      try {
        // 等待 CDN 脚本加载完成（最多 15 秒）
        const SplineRuntime = await new Promise<any>((resolve, reject) => {
          const start = Date.now()
          const check = () => {
            if ((window as any).SplineRuntime) {
              resolve((window as any).SplineRuntime)
            } else if (Date.now() - start > 15000) {
              reject(new Error('Spline Runtime CDN 加载超时'))
            } else {
              setTimeout(check, 200)
            }
          }
          check()
        })
        
        const { Application } = SplineRuntime
        app = new Application(canvasRef.current!, { renderOnDemand: true })
        await app.load('/scenes/spirit-scene.splinecode')
        if (disposed) {
          try { app.dispose() } catch {}
          return
        }
        app.setBackgroundColor('transparent')
        ;(window as any).__splineApp = app
        setLoadState('success')
      } catch (err: any) {
        if (disposed) return
        const msg = err?.message || String(err)
        setErrorMsg(msg.substring(0, 150))
        setLoadState('error')
        console.error('[Spirit] Load error:', err)
      }
    }

    loadScene()

    return () => {
      disposed = true
      if (app) {
        try { app.dispose() } catch {}
      }
    }
  }, [mounted, retryKey])

  const handleRetry = useCallback(() => {
    setRetryKey(k => k + 1)
  }, [])

  return (
    <div className="fixed inset-0 bg-dark-950 overflow-hidden">
      {/* 通过 CDN 加载 Spline Runtime，绕过 Next.js chunk splitting 导致的 404 问题 */}
      <Script
        src="https://unpkg.com/@splinetool/runtime@1.12.92/runtime.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('[Spirit] Spline Runtime CDN loaded')
        }}
        onError={(e) => {
          console.error('[Spirit] Spline Runtime CDN load error:', e)
          setErrorMsg('CDN 加载失败')
          setLoadState('error')
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        {loadState === 'loading' && <LoadingSkeleton isPortrait={isPortrait} />}
        {loadState === 'error' && <ErrorFallback msg={errorMsg} onRetry={handleRetry} />}
        {loadState === 'success' && (
          <>
            <canvas ref={canvasRef} className="w-full h-full touch-none" />
            {/* 水印遮罩 */}
            <div className="absolute bottom-0 right-0 w-36 h-12 z-40 bg-dark-950" />
            <div className="absolute bottom-0 left-0 right-0 h-8 z-40 bg-gradient-to-b from-transparent to-dark-950 pointer-events-none" />
            <div className="absolute top-0 right-0 w-8 h-full z-40 bg-gradient-to-l from-dark-950 to-transparent pointer-events-none" />
          </>
        )}
      </div>

      <Link
        href="/lab"
        className="fixed top-4 left-4 z-50 group flex items-center gap-1.5 px-3 py-1.5 bg-dark-900/70 backdrop-blur-sm border border-white/5 rounded-full hover:border-violet-400/30 hover:text-white transition-all duration-300"
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
