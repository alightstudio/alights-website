'use client'

import { useRef, useEffect, useCallback } from 'react'

export interface SpotlightConfig {
  enabled?: boolean
  glowColor?: string
  darkColor?: string
  glowSize?: number       // 径向光圈半径（像素）
  glowSpread?: number     // 衰减距离
  accentGlow?: boolean    // 是否显示金色环境光
  accentColor?: string    // 金色环境光颜色
  textShadowGlow?: number // 亮文字光晕大小
}

const DEFAULTS: Required<SpotlightConfig> = {
  enabled: true,
  glowColor: '#f5f0e8',
  darkColor: '#1a1a1a',
  glowSize: 160,
  glowSpread: 60,
  accentGlow: true,
  accentColor: '#c9a962',
  textShadowGlow: 40,
}

export function resolveSpotlightConfig(raw: any): SpotlightConfig {
  if (!raw || typeof raw !== 'object') return {}
  return {
    enabled: raw.enabled !== false,
    glowColor: raw.glowColor || DEFAULTS.glowColor,
    darkColor: raw.darkColor || DEFAULTS.darkColor,
    glowSize: Number(raw.glowSize) || DEFAULTS.glowSize,
    glowSpread: Number(raw.glowSpread) || DEFAULTS.glowSpread,
    accentGlow: raw.accentGlow !== false,
    accentColor: raw.accentColor || DEFAULTS.accentColor,
    textShadowGlow: Number(raw.textShadowGlow) || DEFAULTS.textShadowGlow,
  }
}

export default function SpotlightText({
  text,
  config,
  className = '',
  glowClassName = '',
}: {
  text: string
  config?: SpotlightConfig | null
  className?: string
  glowClassName?: string
}) {
  const cfg = { ...DEFAULTS, ...(config || {}) }
  const containerRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = clientX - r.left
    const y = clientY - r.top
    const pctX = ((clientX - r.left) / r.width) * 100
    const pctY = ((clientY - r.top) / r.height) * 100
    const size = cfg.glowSize
    const spread = cfg.glowSpread

    // 更新亮层 mask-image 径向遮罩
    if (layerRef.current) {
      layerRef.current.style.maskImage = `radial-gradient(circle ${size}px at ${x}px ${y}px, black 0%, black 50%, transparent 100%)`
      layerRef.current.style.webkitMaskImage = `radial-gradient(circle ${size}px at ${x}px ${y}px, black 0%, black 50%, transparent 100%)`
    }

    // 更新金色环境光位置
    el.style.setProperty('--mx', pctX + '%')
    el.style.setProperty('--my', pctY + '%')
  }, [cfg.glowSize])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !cfg.enabled) return

    // 初始化亮层 mask（隐藏状态）
    if (layerRef.current) {
      const initMask = `radial-gradient(circle 0px at 50% 50%, black 0%, transparent 100%)`
      layerRef.current.style.maskImage = initMask
      layerRef.current.style.webkitMaskImage = initMask
    }

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY)
    }
    const onMouseLeave = () => {
      if (layerRef.current) {
        const hideMask = `radial-gradient(circle 0px at 50% 50%, black 0%, transparent 100%)`
        layerRef.current.style.maskImage = hideMask
        layerRef.current.style.webkitMaskImage = hideMask
        layerRef.current.style.transition = '-webkit-mask-image 0.4s ease, mask-image 0.4s ease'
        setTimeout(() => {
          if (layerRef.current) layerRef.current.style.transition = ''
        }, 400)
      }
    }

    el.addEventListener('mousemove', onMouseMove, { passive: true })
    el.addEventListener('mouseleave', onMouseLeave)
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onMouseLeave)
    el.addEventListener('touchcancel', onMouseLeave)

    return () => {
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseleave', onMouseLeave)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onMouseLeave)
      el.removeEventListener('touchcancel', onMouseLeave)
    }
  }, [cfg.enabled, handleMove])

  if (!cfg.enabled) {
    return <div className={className}>{text}</div>
  }

  return (
    <div
      ref={containerRef}
      className={`spotlight-container inline-block ${className}`}
      style={{
        position: 'relative',
        cursor: 'default',
        lineHeight: 1.4,
      }}
    >
      {/* 暗色底层文字 */}
      <div className={className} style={{ color: cfg.darkColor, position: 'relative', zIndex: 1 }}>
        {text}
      </div>
      {/* 亮色遮罩层 — 通过 mask-image 径向渐变显示 */}
      <div
        ref={layerRef}
        className={`spotlight-layer ${glowClassName}`}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: cfg.glowColor,
          textShadow: `0 0 ${cfg.textShadowGlow}px ${cfg.glowColor}66`,
          pointerEvents: 'none',
          zIndex: 2,
        }}
        aria-hidden="true"
      >
        {text}
      </div>
      {/* 金色环境光晕 */}
      {cfg.accentGlow && (
        <div
          style={{
            position: 'absolute',
            top: 'var(--my, 50%)',
            left: 'var(--mx, 50%)',
            width: cfg.glowSize * 2,
            height: cfg.glowSize * 2,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle ${cfg.glowSize * 0.75}px at center, ${cfg.accentColor}14 0%, transparent 70%)`,
            pointerEvents: 'none',
            opacity: 0,
            transition: 'opacity 0.3s',
            zIndex: 0,
          }}
          className="spotlight-accent"
        />
      )}
    </div>
  )
}
