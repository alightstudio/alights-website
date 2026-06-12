import Link from 'next/link'
import { COMPANY_NAME } from '@/lib/site-constants'

const experiences = [
  {
    id: 'canvas',
    name: '光迹',
    eng: 'Light Trace',
    desc: '协作 · 像素画布',
    color: '#C9A962',
    href: '/lab/canvas',
    bg: 'from-dark-900 via-dark-800 to-dark-900',
  },
  {
    id: 'spirit',
    name: '光灵',
    eng: 'Light Spirit',
    desc: '交互 · 3D 探索',
    color: '#A78BFA',
    href: '/lab/spirit',
    bg: 'from-dark-900 via-violet-950/20 to-dark-900',
  },
  {
    id: 'piano',
    name: '光音',
    eng: 'Light Tone',
    desc: '弹奏 · 指尖钢琴',
    color: '#F472B6',
    href: '/lab/piano',
    bg: 'from-dark-900 via-violet-950/20 to-dark-900',
  },
  {
    id: 'spirit-test',
    name: '探灵',
    eng: 'Spirit Test',
    desc: '测试 · 灵魂问卷',
    color: '#F59E0B',
    href: '/lab/spirit-test',
    bg: 'from-dark-900 via-amber-950/20 to-dark-900',
  },
]

export default function LabPage() {
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* 主标题区 */}
      <header className="pt-32 pb-16 md:pt-40 md:pb-20 px-8 md:px-16 text-center">
        <h1 className="font-display text-4xl md:text-6xl text-white tracking-wider">
          栖光<span className="text-gray-500">·</span>实验室
        </h1>
        <p className="mt-4 text-sm text-gray-600 tracking-widest uppercase">
          Alights Lab · Interactive Experiments
        </p>
        <div className="mt-6 w-12 h-px bg-accent-gold/30 mx-auto" />
        <p className="mt-6 max-w-xl mx-auto text-sm text-gray-600 leading-relaxed">
          光在这里停留，交互是创作的延伸。
          点击进入任意实验，探索光影与声音的边界。
        </p>
      </header>

      {/* 实验卡片网格 */}
      <div className="flex-1 px-8 md:px-16 pb-24 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-dark-800/30">
          {experiences.map((exp) => (
            <Link
              key={exp.id}
              href={exp.href}
              className="group relative flex flex-col justify-end h-[320px] md:h-[400px] overflow-hidden bg-dark-900 hover:bg-dark-800 transition-all duration-500"
            >
              {/* 背景渐变动画 */}
              <div className={`absolute inset-0 bg-gradient-to-br ${exp.bg} opacity-50 group-hover:opacity-80 transition-opacity duration-700`} />

              {/* 悬停光效 */}
              <div
                className="absolute -inset-20 opacity-0 group-hover:opacity-20 transition-all duration-700
                  bg-gradient-radial from-transparent via-transparent to-transparent"
                style={{
                  background: `radial-gradient(800px circle at 50% 50%, ${exp.color}15, transparent 60%)`,
                }}
              />

              {/* 编号 */}
              <div className="absolute top-6 left-6 text-xs text-gray-700 font-mono tracking-widest">
                /{exp.id}
              </div>

              {/* 内容 */}
              <div className="relative z-10 p-8 md:p-10">
                <div
                  className="w-10 h-px mb-4 transition-all duration-500 group-hover:w-16"
                  style={{ backgroundColor: exp.color }}
                />
                <h2 className="text-2xl md:text-3xl text-white font-light tracking-wider mb-1">
                  {exp.name}
                </h2>
                <p
                  className="text-xs tracking-[0.2em] uppercase mb-3 transition-colors duration-500"
                  style={{ color: exp.color }}
                >
                  {exp.eng}
                </p>
                <p className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors duration-500">
                  {exp.desc}
                </p>
              </div>

              {/* 底部装饰线 */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[1px] scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left"
                style={{ backgroundColor: exp.color }}
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-8 md:px-16 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-gray-700">
          <span>{COMPANY_NAME}</span>
          <span>Alights Lab © 2026</span>
        </div>
      </footer>
    </div>
  )
}
