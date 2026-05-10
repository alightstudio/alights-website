'use client'

import { useState, useRef } from 'react'

interface LabFrameProps {
  src: string
  title: string
  subtitle: string
}

export default function LabFrame({ src, title, subtitle }: LabFrameProps) {
  const [loaded, setLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  return (
    <div className="fixed inset-0 bg-dark-950 z-50">
      {/* 加载骨架屏 */}
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-950 transition-opacity duration-500">
          <div className="relative mb-8">
            <div className="w-12 h-12 border border-white/10 rounded-full animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-white/5 rounded-full" />
            </div>
          </div>
          <div className="text-white/10 text-xs tracking-[0.3em] mb-2 uppercase">
            {title}
          </div>
          <div className="text-white/5 text-[10px] tracking-widest">
            {subtitle}
          </div>
        </div>
      )}

      {/* 返回按钮 */}
      <a
        href="/lab"
        className="fixed top-4 left-4 z-[999] px-3 py-1.5 text-xs text-white/40 hover:text-white/80 transition tracking-widest bg-dark-950/40 backdrop-blur-sm rounded"
      >
        ← 返回实验室
      </a>
      <span className="fixed top-4 right-6 z-[999] text-xs text-white/20 tracking-[0.3em]">
        {title}
      </span>

      {/* 使用 meta refresh 跳转到实验页面（全屏） */}
      <meta httpEquiv="refresh" content={`0;url=${src}`} />
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-950">
        <div className="text-white/20 text-xs tracking-widest mb-4">正在启动实验...</div>
        <div className="text-white/10 text-xs tracking-widest mb-12">{title}</div>
        <div className="animate-pulse text-white/5 text-[10px] tracking-widest">LOADING</div>
        <noscript>
          <a href={src} className="mt-8 px-6 py-3 border border-white/20 text-white/30 text-xs tracking-widest">
            点击进入实验
          </a>
        </noscript>
      </div>
      {/* 同时加载 iframe 以防 meta refresh 不工作 */}
      <iframe
        ref={iframeRef}
        src={src}
        className={`fixed inset-0 w-screen h-screen border-none transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        title={title}
        onLoad={() => setLoaded(true)}
        style={{ zIndex: 1, left: 0, top: 0 }}
      />
    </div>
  )
}
