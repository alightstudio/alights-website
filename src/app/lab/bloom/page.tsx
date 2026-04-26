import Link from 'next/link'

export const metadata = {
  title: '光影 | Alights Lab',
  description: '长按·粒子绽放 · 2016',
}

export default function BloomPage() {
  return (
    <div className="fixed inset-0 bg-dark-950 z-50">
      {/* 返回按钮 */}
      <Link
        href="/lab"
        className="fixed top-4 left-4 z-[999] px-3 py-1.5 text-xs text-white/40 hover:text-white/80 transition tracking-widest bg-dark-950/40 backdrop-blur-sm rounded"
      >
        ← 返回实验室
      </Link>
      <span className="fixed top-4 right-6 z-[999] text-xs text-white/20 tracking-[0.3em]">
        光影
      </span>
      <iframe
        src="/experiments/bloom/index.html"
        className="w-full h-full border-none"
        title="光影"
      />
    </div>
  )
}
