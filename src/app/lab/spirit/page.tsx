'use client'

import { useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

// ══ 光灵 Canvas 粒子系统 ══
// 效果：漂浮光粒子 + 鼠标引力 + 点击能量爆发 + 粒子间光线连接

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  hue: number // 色相（紫/金）
  alpha: number
  life: number // 生命周期（点击产生的粒子会消散）
  isEphemeral: boolean // 是否是临时粒子
}

export default function SpiritPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0, active: false })
  const animationRef = useRef<number>(0)

  // 初始化粒子
  const initParticles = useCallback((width: number, height: number) => {
    const count = Math.floor((width * height) / 15000) // 密度控制
    const particles: Particle[] = []
    
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        hue: Math.random() > 0.7 ? 45 : 270, // 70%紫 30%金
        alpha: Math.random() * 0.5 + 0.3,
        life: Infinity,
        isEphemeral: false
      })
    }
    
    particlesRef.current = particles
  }, [])

  // 点击产生能量爆发
  const burstParticles = useCallback((x: number, y: number) => {
    const burstCount = 20
    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.PI * 2 * i) / burstCount
      const speed = Math.random() * 3 + 2
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        hue: Math.random() > 0.5 ? 270 : 45,
        alpha: 0.8,
        life: 60, // 60帧后消散
        isEphemeral: true
      })
    }
  }, [])

  // Canvas 动画循环
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const { width, height } = canvas
    const mouse = mouseRef.current
    const particles = particlesRef.current
    
    // 清空画布（带渐隐效果）
    ctx.fillStyle = 'rgba(9, 9, 11, 0.15)' // dark-950 半透明
    ctx.fillRect(0, 0, width, height)
    
    // 更新并绘制粒子
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      
      // 生命周期衰减
      if (p.isEphemeral) {
        p.life--
        p.alpha *= 0.97
        if (p.life <= 0 || p.alpha < 0.01) {
          particles.splice(i, 1)
          continue
        }
      }
      
      // 鼠标引力
      if (mouse.active) {
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150 && dist > 5) {
          const force = (150 - dist) / 150 * 0.02
          p.vx += dx / dist * force
          p.vy += dy / dist * force
        }
      }
      
      // 速度衰减
      p.vx *= 0.99
      p.vy *= 0.99
      
      // 移动
      p.x += p.vx
      p.y += p.vy
      
      // 边界处理（软反弹）
      if (p.x < 0) { p.x = 0; p.vx *= -0.5 }
      if (p.x > width) { p.x = width; p.vx *= -0.5 }
      if (p.y < 0) { p.y = 0; p.vy *= -0.5 }
      if (p.y > height) { p.y = height; p.vy *= -0.5 }
      
      // 绘制粒子（光晕效果）
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
      gradient.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${p.alpha})`)
      gradient.addColorStop(0.5, `hsla(${p.hue}, 60%, 50%, ${p.alpha * 0.5})`)
      gradient.addColorStop(1, `hsla(${p.hue}, 40%, 30%, 0)`)
      
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      
      // 绘制粒子核心（更亮）
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${p.hue}, 90%, 85%, ${p.alpha})`
      ctx.fill()
    }
    
    // 绘制粒子间的光线连接（距离<80px时）
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i]
        const p2 = particles[j]
        const dx = p1.x - p2.x
        const dy = p1.y - p2.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < 80) {
          const alpha = (80 - dist) / 80 * 0.15 * Math.min(p1.alpha, p2.alpha)
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.strokeStyle = `hsla(270, 60%, 60%, ${alpha})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }
    
    animationRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // 设置 canvas 尺寸
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles(canvas.width, canvas.height)
    }
    
    resize()
    window.addEventListener('resize', resize)
    
    // 鼠标交互
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
      mouseRef.current.active = true
    }
    
    const handleMouseLeave = () => {
      mouseRef.current.active = false
    }
    
    const handleClick = (e: MouseEvent) => {
      burstParticles(e.clientX, e.clientY)
    }
    
    // 触摸交互
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      mouseRef.current.x = touch.clientX
      mouseRef.current.y = touch.clientY
      mouseRef.current.active = true
    }
    
    const handleTouchEnd = () => {
      mouseRef.current.active = false
    }
    
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      burstParticles(touch.clientX, touch.clientY)
    }
    
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true })
    canvas.addEventListener('touchend', handleTouchEnd)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
    
    // 启动动画
    animate()
    
    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
      canvas.removeEventListener('touchstart', handleTouchStart)
      cancelAnimationFrame(animationRef.current)
    }
  }, [animate, initParticles, burstParticles])

  return (
    <div className="fixed inset-0 bg-dark-950 overflow-hidden">
      {/* Canvas 画布 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
      />
      
      {/* 边缘渐隐遮罩 */}
      <div className="absolute bottom-0 left-0 right-0 h-12 z-40 bg-gradient-to-b from-transparent to-dark-950 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-8 z-40 bg-gradient-to-t from-transparent to-dark-950/50 pointer-events-none" />
      <div className="absolute top-0 bottom-0 left-0 w-8 z-40 bg-gradient-to-r from-dark-950/50 to-transparent pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-8 z-40 bg-gradient-to-l from-dark-950/50 to-transparent pointer-events-none" />
      
      {/* 返回按钮 */}
      <Link
        href="/lab"
        className="fixed top-4 left-4 z-50 group flex items-center gap-1.5 px-3 py-1.5 bg-dark-900/70 backdrop-blur-sm border border-white/5 rounded-full hover:border-violet-400/30 transition-all duration-300"
      >
        <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-[11px] text-gray-500 group-hover:text-white tracking-wider">返回</span>
      </Link>
      
      {/* 标题 */}
      <div className="fixed bottom-6 left-4 z-50 max-w-xs">
        <div className="inline-block bg-dark-950/60 backdrop-blur-sm px-3.5 py-2.5 rounded-lg border border-white/5">
          <div className="w-6 h-px bg-violet-400/50 mb-1.5" />
          <h1 className="text-lg text-white font-light tracking-wider">光灵</h1>
          <p className="text-[9px] text-violet-400/70 tracking-[0.2em] uppercase">Light Spirit</p>
        </div>
      </div>
      
      {/* 交互提示 */}
      <div className="fixed bottom-6 right-4 z-50">
        <div className="text-[10px] text-gray-600/60 tracking-wider">
          移动鼠标 · 点击释放能量
        </div>
      </div>
    </div>
  )
}