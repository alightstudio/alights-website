'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

export interface SpotlightConfig {
  enabled?: boolean
  glowColor?: string
  glowSize?: number
  glowSpread?: number
}

const DEFAULTS: Required<SpotlightConfig> = {
  enabled: true,
  glowColor: '#f5f0e8',
  glowSize: 120,    // 照亮半径（像素）
  glowSpread: 60,   // 衰减距离（像素），越大过渡越柔和
}

export function resolveSpotlightConfig(raw: any): SpotlightConfig {
  if (!raw || typeof raw !== 'object') return {}
  return {
    enabled: raw.enabled !== false,
    glowColor: raw.glowColor || DEFAULTS.glowColor,
    glowSize: Number(raw.glowSize) || DEFAULTS.glowSize,
    glowSpread: Number(raw.glowSpread) || DEFAULTS.glowSpread,
  }
}

export default function SpotlightText({
  text,
  config,
  darkColor = '#333333',
  className = '',
  glowClassName = '',
}: {
  text: string
  config?: SpotlightConfig | null
  darkColor?: string
  className?: string
  glowClassName?: string
}) {
  const cfg = { ...DEFAULTS, ...(config || {}) }
  const containerRef = useRef<HTMLDivElement>(null)
  const charRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [distances, setDistances] = useState<number[]>([])
  const [hovering, setHovering] = useState(false)
  const animFrame = useRef<number>(0)

  const chars = Array.from(text)

  // 计算每个字符到鼠标的距离（归一化：0=鼠标位置, 1=glowSize+glowSpread 之外）
  const computeDistances = useCallback((mx: number, my: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const d: number[] = []
    const maxDist = cfg.glowSize + cfg.glowSpread
    for (let i = 0; i < chars.length; i++) {
      const el = charRefs.current[i]
      if (!el) { d.push(1); continue }
      const cr = el.getBoundingClientRect()
      const cx = cr.left + cr.width / 2 - rect.left
      const cy = cr.top + cr.height / 2 - rect.top
      const dist = Math.hypot(cx - mx, cy - my)
      // 0 = at mouse, 1 = at or beyond maxDist
      d.push(Math.min(1, dist / maxDist))
    }
    setDistances(d)
  }, [chars.length, cfg.glowSize, cfg.glowSpread])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onMove = (e: MouseEvent | TouchEvent) => {
      const r = el.getBoundingClientRect()
      let mx: number, my: number
      if ('touches' in e) {
        if (e.touches.length === 0) return
        mx = e.touches[0].clientX - r.left
        my = e.touches[0].clientY - r.top
      } else {
        mx = e.clientX - r.left
        my = e.clientY - r.top
      }
      // 鼠标/手指在容器内才计算
      if (mx >= 0 && mx <= r.width && my >= 0 && my <= r.height) {
        if (!hovering) setHovering(true)
        cancelAnimationFrame(animFrame.current)
        animFrame.current = requestAnimationFrame(() => computeDistances(mx, my))
      }
    }
    const onLeave = () => {
      setHovering(false)
      setDistances([])
    }

    el.addEventListener('mousemove', onMove, { passive: true })
    el.addEventListener('mouseleave', onLeave)
    // 移动端触摸支持
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onLeave)
    el.addEventListener('touchcancel', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onLeave)
      el.removeEventListener('touchcancel', onLeave)
      cancelAnimationFrame(animFrame.current)
    }
  }, [computeDistances, hovering])

  if (!cfg.enabled) {
    return <div className={`${className} ${glowClassName}`}>{text}</div>
  }

  return (
    <div
      ref={containerRef}
      className={`inline-block ${className}`}
      style={{ cursor: 'default', lineHeight: 1.4 }}
    >
      {chars.map((char, i) => {
        const d = distances[i]
        const isLit = hovering && d !== undefined && d < 1

        // 强度：0（鼠标处）→ 最亮，1（边缘/外）→ 全暗
        const intensity = isLit ? Math.max(0, 1 - d) : 0
        // smoothstep 让高亮区更锐利
        const t = intensity * intensity * (3 - 2 * intensity)
        const alpha = t

        // 颜色从暗色渐变到亮色
        const r1 = 51, g1 = 51, b1 = 51   // darkColor #333333
        const r2 = 245, g2 = 240, b2 = 232 // glowColor #f5f0e8
        const r = Math.round(r1 + (r2 - r1) * alpha)
        const g = Math.round(g1 + (g2 - g1) * alpha)
        const b = Math.round(b1 + (b2 - b1) * alpha)

        // glow: 光照范围内的字符增加光晕
        const glowIntensity = t * 24

        return (
          <span
            key={i}
            ref={el => { charRefs.current[i] = el }}
            className={`${isLit ? glowClassName : ''}`}
            style={{
              color: `rgb(${r},${g},${b})`,
              textShadow: isLit
                ? `0 0 ${glowIntensity}px ${cfg.glowColor}, 0 0 ${glowIntensity * 3}px ${cfg.glowColor}40`
                : 'none',
              transition: isLit ? 'none' : 'color 0.4s ease, text-shadow 0.4s ease',
            }}
          >
            {char}
          </span>
        )
      })}
    </div>
  )
}
