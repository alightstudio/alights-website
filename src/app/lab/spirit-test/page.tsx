'use client'

import { useEffect, useRef, useState } from 'react'

export default function SpiritTestPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState('Initializing...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    let app: any = null

    async function init() {
      try {
        setStatus('Loading Spline Runtime...')
        // 动态导入 Spline Runtime
        const { Application } = await import('@splinetool/runtime')
        setStatus('Creating Application...')

        app = new Application(canvasRef.current!, {
          renderOnDemand: true,
        })
        setStatus('Loading scene...')

        // 尝试加载本地场景
        await app.load('/scenes/spirit-scene.splinecode')
        setStatus('SUCCESS! Scene loaded!')
        app.setBackgroundColor('transparent')
      } catch (err: any) {
        const msg = err?.message || String(err)
        const stack = err?.stack ? '\n' + err.stack.substring(0, 500) : ''
        setError(msg + stack)
        setStatus('FAILED')
        console.error('[SpiritTest] Load error:', err)
      }
    }

    init()

    return () => {
      if (app) {
        try { app.dispose() } catch {}
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-dark-950 flex items-center justify-center flex-col gap-6">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
        <p className="text-sm text-gray-400 mb-2">{status}</p>
        {error && (
          <pre className="text-xs text-red-400 bg-dark-900/80 p-4 rounded-lg max-w-lg overflow-auto max-h-64 text-left whitespace-pre-wrap">
            {error}
          </pre>
        )}
      </div>
    </div>
  )
}
