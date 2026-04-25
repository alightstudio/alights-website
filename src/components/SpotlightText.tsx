'use client'

import { useRef, useEffect, useCallback } from 'react'

export interface SpotlightConfig {
  enabled?: boolean
  glowColor?: string
  darkColor?: string
  glowSize?: number       // 近距离时亮圈半径
  glowSpread?: number     // 衰减距离
  detectRadius?: number   // 远距离感应半径
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
  const textRef = useRef<HTMLSpanElement>(null)
  const accentRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  const update = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current
    const span = textRef.current
    const accent = accentRef.current
    if (!el || !span) return

    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dist = Math.hypot(clientX - cx, clientY - cy)
    const detect = cfg.detectRadius

    // intensity: 0=远, 1=正中
    const raw = Math.max(0, Math.min(1, 1 - dist / detect))
    const t = 1 - Math.pow(1 - raw, 4) // easeOutQuart

    if (t < 0.005) {
      // 无效果：纯暗色
      span.style.backgroundImage = 'none'
      span.style.webkitTextFillColor = cfg.darkColor
      if (accent) accent.style.opacity = '0'
      return
    }

    const x = clientX - rect.left
    const y = clientY - rect.top

    // 动态半径：远→大且淡, 近→小且浓
    const maxR = detect * 0.8
    const minR = cfg.glowSize
    const r = maxR - (maxR - minR) * t

    // 单层方案：background-clip: text，渐变即文字颜色
    // 中心亮 → 外缘暗，完全平滑，无任何硬边
    span.style.backgroundImage = `radial-gradient(circle ${r}px at ${x}px ${y}px, ${cfg.glowColor}, ${cfg.darkColor})`
    span.style.webkitBackgroundClip = 'text'
    span.style.backgroundClip = 'text'
    span.style.webkitTextFillColor = 'transparent'
    span.style.color = 'transparent'



    // 金色环境光
    if (accent) {
      const pctX = (x / rect.width) * 100
      const pctY = (y / rect.height) * 100
      accent.style.top = pctY + '%'
      accent.style.left = pctX + '%'
      const sz = r * 1.4
      accent.style.width = sz + 'px'
      accent.style.height = sz + 'px'
      accent.style.opacity = String(t * 0.7)
    }
  }, [cfg.glowColor, cfg.darkColor, cfg.glowSize, cfg.detectRadius, cfg.textShadowGlow])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !cfg.enabled) return

    // 初始暗色
    if (textRef.current) {
      textRef.current.style.webkitTextFillColor = cfg.darkColor
      textRef.current.style.color = cfg.darkColor
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
    const onLeave = () => {
      // 全局监听会自然衰减
    }

    document.addEventListener('mousemove', onMouseMove, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onLeave)
    el.addEventListener('touchcancel', onLeave)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onLeave)
      el.removeEventListener('touchcancel', onLeave)
      cancelAnimationFrame(rafRef.current)
    }
  }, [cfg.enabled, cfg.darkColor, update])

  if (!cfg.enabled) {
    return <div className={className}>{text}</div>
  }

  return (
    <div
      ref={containerRef}
      className="spotlight-container inline-block"
      style={{ position: 'relative', cursor: 'default', lineHeight: 1.4 }}
    >
      <span
        ref={textRef}
        className={className}
        style={{
          display: 'inline-block',
          willChange: 'background-image',
        }}
      >
        {text}
      </span>
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
