'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ReviewUploadPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoName, setVideoName] = useState('')
  const [mode, setMode] = useState<'url' | 'local'>('url')
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')

  // 上传状态也支持
  const handleCreate = async () => {
    if (!title.trim() || !videoUrl.trim()) {
      setError('请填写标题和视频链接')
      return
    }

    setCreating(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/review/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          videoUrl: videoUrl.trim(),
          videoName: videoName.trim() || title.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-['Inter']">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* 标题 */}
        <div className="mb-10">
          <h1 className="text-2xl font-light tracking-tight mb-2">在线审片</h1>
          <p className="text-sm text-zinc-500">创建审片链接，甲方无需登录即可逐帧标注</p>
        </div>

        {/* 操作指南 */}
        <div className="mb-8 p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-400">
          <p className="mb-2 font-medium text-zinc-300">💡 视频文件上传两种方式：</p>
          <ol className="space-y-1.5 list-decimal list-inside marker:text-zinc-600">
            <li>
              <span className="text-zinc-300">本地上传</span> — 先跑脚本上传视频，再粘贴 URL：
              <code className="ml-1 px-2 py-0.5 bg-zinc-800 text-xs rounded text-zinc-400">
                node scripts/upload-review.mjs ~/Desktop/DEMO/xxx.mp4
              </code>
            </li>
            <li>
              <span className="text-zinc-300">已有链接</span> — 直接粘贴已托管在 CDN 的视频地址
            </li>
          </ol>
        </div>

        {/* 表单 */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">项目名称</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. 宁德时代磐石底盘"
              className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-white text-sm
                         placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">原始文件名（选填）</label>
            <input
              type="text"
              value={videoName}
              onChange={e => setVideoName(e.target.value)}
              placeholder="e.g. 宁德时代磐石底盘.mp4"
              className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-white text-sm
                         placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">视频链接</label>
            <input
              type="url"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://xxx.public.blob.vercel-storage.com/..."
              className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-white text-sm
                         placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-3 bg-white text-black text-sm font-medium rounded-lg
                       hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {creating ? '创建中…' : '生成审片链接'}
          </button>
        </div>

        {/* 结果 */}
        {result && (
          <div className="mt-10 p-5 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-3">
            <p className="text-sm text-green-400 font-medium">✅ 审片链接已创建</p>

            <div className="space-y-2">
              <div>
                <p className="text-xs text-zinc-500 mb-1">审片链接</p>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 bg-zinc-800 rounded text-xs text-zinc-300 break-all">
                    {result.url}
                  </code>
                  <button
                    onClick={() => copyToClipboard(result.url)}
                    className="px-3 py-2 bg-zinc-800 rounded text-xs text-zinc-400 hover:text-white transition-colors shrink-0"
                  >
                    复制
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-zinc-500 mb-1">访问码</p>
                <div className="flex gap-2 items-center">
                  <span className="text-2xl font-mono tracking-widest text-yellow-400">
                    {result.passcode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(result.passcode)}
                    className="px-3 py-1 bg-zinc-800 rounded text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    复制
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push(`/review/${result.id}?code=${result.passcode}`)}
              className="w-full mt-2 py-2.5 border border-zinc-700 text-sm text-zinc-300 rounded-lg
                         hover:bg-zinc-800 transition-colors"
            >
              预览审片页面 →
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
