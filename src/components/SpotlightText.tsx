'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

export interface SpotlightConfig {
  enabled?: boolean
  glowColor?: string
  darkColor?: string
  glowSize?: number       // 近距离时亮圈半径
  glowSpread?: number     // 衰减距离
  detectRadius?: number   // 远距离感应半径（鼠标在此范围内开始显现）
  accentGlow?: boolean
  accentColor?: string
  textShadowGlow?: number
}

const DEFAULTS: Required<SpotlightConfig> = {
  enabled: true,
  glowColor: '#f5f0e8',
  darkColor: '#1a1a1a',
  glowSize: 220,
  glowSpread: 80,
  detectRadius: 500,
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
    detectRadius: Number(raw.detectRadius) || DEFAULTS.detectRadius,
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
  const accentRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  const update = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current
    const layer = layerRef.current
    const accent = accentRef.current
    if (!el || !layer) return

    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dist = Math.hypot(clientX - cx, clientY - cy)
    const detect = cfg.detectRadius
    const size = cfg.glowSize

    // intensity: 0 = far away, 1 = at center of text
    const intensity = Math.max(0, Math.min(1, 1 - dist / detect))
    // easeOutQuart for smooth approach feel
    const t = 1 - Math.pow(1 - intensity, 4)

    if (t < 0.005) {
      // 完全隐藏
      layer.style.opacity = '0'
      if (accent) accent.style.opacity = '0'
      return
    }

    // 鼠标相对于容器内的坐标
    const x = clientX - rect.left
    const y = clientY - rect.top

    // 动态半径：远时大且淡，近时小且浓
    // 远距离：大圈 diffuse glow（接近 detectRadius 大小）
    // 近距离：收拢到 glowSize
    const maxRadius = detect * 0.8
    const minRadius = size
    const currentRadius = maxRadius - (maxRadius - minRadius) * t

    // mask 渐变：中心不透明 → 外缘全透明，无硬边
    // black 0% → transparent 100%，完全平滑
    const mask = `radial-gradient(circle ${currentRadius}px at ${x}px ${y}px, black 0%, transparent 100%)`
    layer.style.maskImage = mask
    layer.style.webkitMaskImage = mask
    layer.style.opacity = String(t)

    // 文字光晕也随 intensity 缩放
    const glow = cfg.textShadowGlow * t
    layer.style.textShadow = `0 0 ${glow}px ${cfg.glowColor}${Math.round(t * 0.4 * 255).toString(16).padStart(2, '0')}`

    // 金色环境光
    if (accent) {
      const pctX = (x / rect.width) * 100
      const pctY = (y / rect.height) * 100
      el.style.setProperty('--mx', pctX + '%')
      el.style.setProperty('--my', pctY + '%')
      const accentSize = currentRadius * 1.5
      accent.style.width = accentSize + 'px'
      accent.style.height = accentSize + 'px'
      accent.style.opacity = String(t * 0.8)
    }
  }, [cfg.glowSize, cfg.detectRadius, cfg.textShadowGlow, cfg.glowColor])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !cfg.enabled) return

    // 初始隐藏
    if (layerRef.current) {
      layerRef.current.style.opacity = '0'
    }

    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => update(e.clientX, e.clientY))
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => update(e.touches[0].clientX, e.touches[0].clientY))
      }
    }
    const onMouseLeave = () => {
      // 不需要处理——document mousemove 会在鼠标远离时自动 t→0
    }

    // 全局监听——近距离感应
    document.addEventListener('mousemove', onMouseMove, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onMouseLeave)
    el.addEventListener('touchcancel', onMouseLeave)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onMouseLeave)
      el.removeEventListener('touchcancel', onMouseLeave)
      cancelAnimationFrame(rafRef.current)
    }
  }, [cfg.enabled, update])

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
      {/* 亮色遮罩层 */}
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
          pointerEvents: 'none',
          zIndex: 2,
          willChange: 'mask-image, opacity',
        }}
        aria-hidden="true"
      >
        {text}
      </div>
      {/* 金色环境光晕 */}
      {cfg.accentGlow && (
        <div
          ref={accentRef}
          style={{
            position: 'absolute',
            top: 'var(--my, 50%)',
            left: 'var(--mx, 50%)',
            width: cfg.detectRadius * 1.2 + 'px',
            height: cfg.detectRadius * 1.2 + 'px',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle 50% at center, ${cfg.accentColor}12 0%, transparent 70%)`,
            pointerEvents: 'none',
            opacity: 0,
            transition: 'width 0.1s, height 0.1s',
            zIndex: 0,
          }}
          className="spotlight-accent"
        />
      )}
    </div>
  )
}
