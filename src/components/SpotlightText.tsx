'use client'

import { useRef, useEffect, useCallback } from 'react'

export interface SpotlightConfig {
  enabled?: boolean
  glowColor?: string
  darkColor?: string
  glowSize?: number
  glowSpread?: number
  detectRadius?: number
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
}: {
  text: string
  config?: SpotlightConfig | null
  className?: string
  glowClassName?: string
}) {
  const cfg = { ...DEFAULTS, ...(config || {}) }
  const containerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const accentRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  const update = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current
    const glow = glowRef.current
    const accent = accentRef.current
    if (!el || !glow) return

    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dist = Math.hypot(clientX - cx, clientY - cy)
    const detect = cfg.detectRadius

    const raw = Math.max(0, Math.min(1, 1 - dist / detect))
    const t = 1 - Math.pow(1 - raw, 4)

    if (t < 0.005) {
      glow.style.opacity = '0'
      if (accent) accent.style.opacity = '0'
      return
    }

    const x = clientX - rect.left
    const y = clientY - rect.top

    const maxR = detect * 0.8
    const minR = cfg.glowSize
    const r = maxR - (maxR - minR) * t

    // 双层方案：暗底层 + 亮遮罩层，用 mask-image 径向渐变
    // 关键：使用 CSS 变量而非 JS 直接设 mask，避免渐变停止点硬边
    el.style.setProperty('--sx', x + 'px')
    el.style.setProperty('--sy', y + 'px')
    el.style.setProperty('--sr', r + 'px')
    glow.style.opacity = String(t)
    glow.style.maskImage = `radial-gradient(circle var(--sr) at var(--sx) var(--sy), black 0%, transparent 100%)`
    glow.style.webkitMaskImage = `radial-gradient(circle var(--sr) at var(--sx) var(--sy), black 0%, transparent 100%)`

    if (accent) {
      const pctX = (x / rect.width) * 100
      const pctY = (y / rect.height) * 100
      accent.style.top = pctY + '%'
      accent.style.left = pctX + '%'
      const sz = r * 1.4
      accent.style.width = sz + 'px'
      accent.style.height = sz + 'px'
      accent.style.opacity = String(t * 0.6)
    }
  }, [cfg.glowSize, cfg.detectRadius])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !cfg.enabled) return

    if (glowRef.current) glowRef.current.style.opacity = '0'

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

    document.addEventListener('mousemove', onMouseMove, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('touchmove', onTouchMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [cfg.enabled, update])

  if (!cfg.enabled) {
    return <div className={className}>{text}</div>
  }

  return (
    <div
      ref={containerRef}
      className="spotlight-container inline-block"
      style={{ position: 'relative', cursor: 'default', lineHeight: 1.4 }}
    >
      {/* 暗色底层文字 */}
      <span className={className} style={{ color: cfg.darkColor }}>
        {text}
      </span>
      {/* 亮色遮罩层 — 绝对定位覆盖，用 mask 渐变显示 */}
      <div
        ref={glowRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          color: cfg.glowColor,
          // 关键：完全复制底层文字样式，确保像素级对齐
        }}
      >
        <span className={className}>
          {text}
        </span>
      </div>
      {/* 金色环境光 */}
      {cfg.accentGlow && (
        <div
          ref={accentRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100px',
            height: '100px',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle 50% at center, ${cfg.accentColor}12 0%, transparent 70%)`,
            pointerEvents: 'none',
            opacity: 0,
            zIndex: -1,
          }}
          className="spotlight-accent"
        />
      )}
    </div>
  )
}
