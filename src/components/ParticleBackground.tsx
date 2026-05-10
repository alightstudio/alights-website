'use client'

import { useEffect, useRef } from 'react'

interface ParticleConfig {
  count: number
  size: number
  connectDist: number
  mouseRadius: number
  speed: number
  color: string
  opacity: number
  lineOpacity: number
  lineWidth: number
  lineWidthBoost: number
  starCount: number
  trailOpacity: number
}

const DEFAULTS: ParticleConfig = {
  count: 200,
  size: 1.2,
  connectDist: 120,
  mouseRadius: 140,
  speed: 0.4,
  color: '#c9a962',
  opacity: 0.6,
  lineOpacity: 0.25,
  lineWidth: 0.3,
  lineWidthBoost: 0.8,
  starCount: 60,
  trailOpacity: 0,
}

function getResponsiveScale(): number {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024
  if (w < 480) return 0.35   // 小手机：35% 粒子数和大小
  if (w < 768) return 0.55   // 大手机/小平板
  if (w < 1024) return 0.8   // 平板
  return 1                    // 桌面全量
}

function scaleParticleConfig(cfg: ParticleConfig, scale: number): ParticleConfig {
  return {
    ...cfg,
    count: Math.round(cfg.count * scale),
    size: cfg.size * (0.6 + 0.4 * scale),
    starCount: Math.round(cfg.starCount * scale),
    connectDist: cfg.connectDist * (0.5 + 0.5 * scale),
    mouseRadius: cfg.mouseRadius * (0.5 + 0.5 * scale),
  }
}

export default function ParticleBackground({ config: userConfig }: { config?: Partial<ParticleConfig> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseCfg = { ...DEFAULTS, ...userConfig }
  // 用 ref 保存事件处理器，确保 cleanup 可以 remove 同一个函数引用
  const onMoveRef = useRef<((e: MouseEvent | Touch) => void) | null>(null)
  const onTouchMoveRef = useRef<(e: TouchEvent) => void>(() => {})
  const onLeaveRef = useRef<() => void>(() => {})
  const onResizeRef = useRef<() => void>(() => {})
  const onTouchEndRef = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scale = getResponsiveScale()
    const cfg = scaleParticleConfig(baseCfg, scale)

    let W: number, H: number
    let animId: number
    let particles: Particle[] = []
    let stars: Star[] = []

    function resize() {
      W = canvas!.width = window.innerWidth
      H = canvas!.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    resize()

    // 解析颜色
    const colorRgb = hexToRgb(cfg.color) || { r: 201, g: 169, b: 98 }

    // 粒子
    class Particle {
      x: number; y: number; vx: number; vy: number
      size: number; baseSize: number; opacity: number
      pulse: number; pulseSpeed: number
      r: number; g: number; b: number

      constructor() {
        this.x = Math.random() * W
        this.y = Math.random() * H
        const angle = Math.random() * Math.PI * 2
        const spd = cfg.speed * (0.5 + Math.random() * 0.8)
        this.vx = Math.cos(angle) * spd
        this.vy = Math.sin(angle) * spd
        this.baseSize = cfg.size * (0.3 + Math.random() * 0.7)
        this.size = this.baseSize
        this.opacity = cfg.opacity * (0.4 + Math.random() * 0.6)
        this.pulse = Math.random() * Math.PI * 2
        this.pulseSpeed = 0.005 + Math.random() * 0.012
        // 颜色在基准色附近浮动
        this.r = clamp(colorRgb.r + (Math.random() - 0.5) * 30, 0, 255)
        this.g = clamp(colorRgb.g + (Math.random() - 0.5) * 30, 0, 255)
        this.b = clamp(colorRgb.b + (Math.random() - 0.5) * 30, 0, 255)
      }

      update() {
        this.pulse += this.pulseSpeed
        this.size = this.baseSize + Math.sin(this.pulse) * 0.4 * cfg.size

        if (this.x < 0) { this.x = 1; this.vx *= -0.9 }
        if (this.x > W) { this.x = W - 1; this.vx *= -0.9 }
        if (this.y < 0) { this.y = 1; this.vy *= -0.9 }
        if (this.y > H) { this.y = H - 1; this.vy *= -0.9 }

        // 鼠标排斥
        const dx = this.x - mouse.x
        const dy = this.y - mouse.y
        const dist = Math.hypot(dx, dy)
        if (dist < cfg.mouseRadius && dist > 1) {
          const force = (cfg.mouseRadius - dist) / cfg.mouseRadius
          const push = force * force * 4
          this.vx += (dx / dist) * push
          this.vy += (dy / dist) * push
          this.vx += mouse.vx * 0.008 * force
          this.vy += mouse.vy * 0.008 * force
        }

        const spd = Math.hypot(this.vx, this.vy)
        const maxSpd = cfg.speed * 5
        if (spd > maxSpd) { this.vx = (this.vx / spd) * maxSpd; this.vy = (this.vy / spd) * maxSpd }
        this.vx *= 0.98
        this.vy *= 0.98
        this.x += this.vx
        this.y += this.vy
      }

      draw() {
        const radius = Math.max(0.01, this.size)
        ctx!.beginPath()
        ctx!.arc(this.x, this.y, radius, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${this.r|0},${this.g|0},${this.b|0},${this.opacity})`
        ctx!.fill()
      }
    }

    // 背景星光
    class Star {
      x: number; y: number; size: number; pulse: number; speed: number
      constructor() {
        this.x = Math.random() * W
        this.y = Math.random() * H
        this.size = 0.2 + Math.random() * 0.5
        this.pulse = Math.random() * Math.PI * 2
        this.speed = 0.008 + Math.random() * 0.02
      }
      draw() {
        this.pulse += this.speed
        const o = 0.03 + Math.sin(this.pulse) * 0.025
        ctx!.beginPath()
        ctx!.arc(this.x, this.y, Math.max(0.01, this.size), 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(255,255,255,${Math.max(o, 0)})`
        ctx!.fill()
      }
    }

    // 鼠标
    const mouse = { x: -9999, y: -9999, vx: 0, vy: 0, prevX: -9999, prevY: -9999, active: false }

    const onMove = (e: MouseEvent | Touch) => {
      const cx = 'clientX' in e ? e.clientX : 0
      const cy = 'clientY' in e ? e.clientY : 0
      mouse.prevX = mouse.x; mouse.prevY = mouse.y
      mouse.x = cx; mouse.y = cy
      mouse.vx = mouse.x - mouse.prevX; mouse.vy = mouse.y - mouse.prevY
      mouse.active = true
    }
    // Pointer events attach to window (canvas has pointer-events:none)
    window.addEventListener('mousemove', onMove as EventListener)
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; mouse.active = false }
    window.addEventListener('mouseleave', onLeave)
    const onTouchMove = (e: TouchEvent) => { onMove(e.touches[0]) }
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    const onTouchEnd = () => { mouse.x = -9999; mouse.y = -9999; mouse.active = false }
    window.addEventListener('touchend', onTouchEnd)

    // 保存引用供 cleanup 使用（确保 remove 的是同一个函数对象）
    onMoveRef.current = onMove
    onTouchMoveRef.current = onTouchMove
    onLeaveRef.current = onLeave
    onResizeRef.current = resize
    onTouchEndRef.current = onTouchEnd

    // 初始化粒子
    function initParticles() {
      particles = []
      stars = []
      for (let i = 0; i < cfg.count; i++) particles.push(new Particle())
      for (let i = 0; i < cfg.starCount; i++) stars.push(new Star())
    }
    initParticles()

    // 连线
    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < cfg.connectDist) {
            const t = 1 - dist / cfg.connectDist
            const alpha = t * t * cfg.lineOpacity
            const r = (a.r + b.r) / 2
            const g = (a.g + b.g) / 2
            const bl = (a.b + b.b) / 2
            let mb = 1
            if (mouse.active) {
              const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
              const md = Math.hypot(mx - mouse.x, my - mouse.y)
              if (md < cfg.mouseRadius * 1.5) mb = 1 + (1 - md / (cfg.mouseRadius * 1.5)) * 2
            }
            ctx!.beginPath()
            ctx!.moveTo(a.x, a.y)
            ctx!.lineTo(b.x, b.y)
            ctx!.strokeStyle = `rgba(${r|0},${g|0},${bl|0},${Math.min(alpha * mb, 0.5)})`
            ctx!.lineWidth = cfg.lineWidth + t * cfg.size * cfg.lineWidthBoost * mb
            ctx!.stroke()
          }
        }
      }
    }

    // 鼠标光晕
    function drawMouseGlow() {
      if (!mouse.active) return
      const grad = ctx!.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, cfg.mouseRadius * 0.6)
      grad.addColorStop(0, `rgba(${colorRgb.r},${colorRgb.g},${colorRgb.b},0.04)`)
      grad.addColorStop(0.5, `rgba(${colorRgb.r},${colorRgb.g},${colorRgb.b},0.015)`)
      grad.addColorStop(1, `rgba(${colorRgb.r},${colorRgb.g},${colorRgb.b},0)`)
      ctx!.fillStyle = grad
      ctx!.fillRect(mouse.x - cfg.mouseRadius, mouse.y - cfg.mouseRadius, cfg.mouseRadius * 2, cfg.mouseRadius * 2)
    }

    // 动画
    function animate() {
      // 半透明拖尾（管理后台可调）
      ctx!.fillStyle = `rgba(8,8,8,${cfg.trailOpacity})`
      ctx!.fillRect(0, 0, W, H)

      // 星光
      for (const s of stars) s.draw()

      // 连线
      drawConnections()

      // 粒子
      for (const p of particles) { p.update(); p.draw() }

      // 鼠标光晕
      drawMouseGlow()

      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      if (onMoveRef.current) window.removeEventListener('mousemove', onMoveRef.current as EventListener)
      if (onLeaveRef.current) window.removeEventListener('mouseleave', onLeaveRef.current)
      if (onTouchMoveRef.current) window.removeEventListener('touchmove', onTouchMoveRef.current)
      if (onTouchEndRef.current) window.removeEventListener('touchend', onTouchEndRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
  )
}

/* ─── Helpers ─── */
function hexToRgb(hex: string) {
  const m = hex.replace('#', '').match(/^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/)
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
