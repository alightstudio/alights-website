'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

interface Comment {
  id: string
  timestamp: number
  comment: string
  author: string
  createdAt: string
}

interface ReviewData {
  id: string
  title: string
  videoUrl?: string
  videoName?: string
  status?: string
  passcode?: string
  locked?: boolean
  commentCount?: number
  createdAt?: string
  comments?: Comment[]
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ReviewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string

  const [review, setReview] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [passcode, setPasscode] = useState(searchParams.get('code') || '')
  const [unlocked, setUnlocked] = useState(!!searchParams.get('code'))

  // Video state
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)

  // Comment state
  const [comments, setComments] = useState<Comment[]>([])
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentTime, setCommentTime] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)

  // Load review
  const loadReview = useCallback(async (code: string) => {
    setLoading(true)
    setError('')
    try {
      const url = code
        ? `/api/review/${id}?code=${encodeURIComponent(code)}`
        : `/api/review/${id}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '加载失败')
      setReview(data)
      if (!data.locked && data.comments) {
        setComments(data.comments)
        setUnlocked(true)
      }
      if (data.locked) {
        setUnlocked(false)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadReview(passcode)
  }, [id])

  const handleUnlock = () => {
    if (!passcode.trim()) return
    loadReview(passcode.trim())
  }

  // Video time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setPlaying(true)
    } else {
      videoRef.current.pause()
      setPlaying(false)
    }
  }

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
  }

  // Open comment input at current time
  const openCommentAt = (time: number) => {
    setCommentTime(time)
    setCommentText('')
    setShowCommentInput(true)
  }

  // Submit comment
  const submitComment = async () => {
    if (!commentText.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/review/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: commentTime,
          comment: commentText.trim(),
          author: '甲方',
        }),
      })
      if (!res.ok) throw new Error('提交失败')
      const newComment = await res.json()
      setComments(prev => [...prev, newComment].sort((a, b) => a.timestamp - b.timestamp))
      setShowCommentInput(false)
      setCommentText('')
    } catch (err) {
      alert('评论提交失败，请重试')
    } finally {
      setSending(false)
    }
  }

  // Keyboard shortcut: C to comment, Space to play/pause
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        openCommentAt(currentTime)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [currentTime])

  // Lock screen
  if (!unlocked) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white font-['Inter'] flex items-center justify-center">
        <div className="max-w-sm w-full mx-6">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-light tracking-tight mb-2">
              {review?.title || '审片'}
            </h1>
            <p className="text-sm text-zinc-500">
              {review?.commentCount ? `共 ${review.commentCount} 条批注` : '请输入访问码查看'}
            </p>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              placeholder="输入 4 位访问码"
              maxLength={4}
              className="w-full text-center text-3xl tracking-[0.5em] py-4 bg-zinc-900/80 border border-zinc-800
                         rounded-lg text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600
                         font-mono transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            />
            <button
              onClick={handleUnlock}
              disabled={loading || !passcode.trim()}
              className="w-full py-3 bg-white text-black text-sm font-medium rounded-lg
                         hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {loading ? '验证中…' : '查看'}
            </button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        </div>
      </main>
    )
  }

  // Loading
  if (loading || !review) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-['Inter']">
      {/* Header */}
      <header className="border-b border-zinc-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-light tracking-tight">{review.title}</h1>
            <p className="text-xs text-zinc-600 mt-0.5">
              {review.videoName} · {comments.length} 条批注 · 按 <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">C</kbd> 添加批注
            </p>
          </div>
          <div className="text-xs text-zinc-500">
            访问码: <span className="font-mono text-yellow-400 tracking-wider">{review.passcode}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Video Player */}
        <div className="flex-1 min-w-0">
          <div className="relative bg-black rounded-lg overflow-hidden border border-zinc-900">
            <video
              ref={videoRef}
              src={review.videoUrl}
              className="w-full aspect-video cursor-pointer"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onClick={togglePlay}
              controls={false}
              playsInline
            />

            {/* Click to comment overlay */}
            {showCommentInput && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder={`在 ${formatTime(commentTime)} 处添加批注…`}
                    className="flex-1 px-4 py-2.5 bg-zinc-900/90 border border-zinc-700 rounded-lg text-sm
                               text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitComment()
                      if (e.key === 'Escape') setShowCommentInput(false)
                    }}
                  />
                  <button
                    onClick={submitComment}
                    disabled={sending || !commentText.trim()}
                    className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-lg
                               hover:bg-zinc-200 disabled:opacity-30 transition-all"
                  >
                    {sending ? '…' : '发送'}
                  </button>
                </div>
              </div>
            )}

            {/* Center play overlay */}
            {!playing && (
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={togglePlay}
              >
                <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar with comments */}
          <div className="mt-2 h-8 relative group">
            {/* Base track */}
            <div
              className="absolute top-3 left-0 right-0 h-1 bg-zinc-800 rounded-full cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const pct = (e.clientX - rect.left) / rect.width
                seekTo(pct * duration)
              }}
            >
              {/* Progress */}
              <div
                className="h-full bg-zinc-500 rounded-full transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
              {/* Comment markers */}
              {comments.map(c => (
                <div
                  key={c.id}
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-400 rounded-full cursor-pointer
                             hover:scale-150 transition-transform z-10"
                  style={{ left: `${duration > 0 ? (c.timestamp / duration) * 100 : 0}%` }}
                  onClick={(e) => {
                    e.stopPropagation()
                    seekTo(c.timestamp)
                  }}
                  title={`${formatTime(c.timestamp)}: ${c.comment}`}
                />
              ))}
            </div>

            {/* Time display */}
            <div className="absolute -bottom-1 left-0 right-0 flex justify-between text-[11px] text-zinc-600">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls bar */}
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400
                         hover:text-white hover:border-zinc-600 transition-all flex items-center gap-2"
            >
              {playing ? (
                <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg> 暂停</>
              ) : (
                <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> 播放</>
              )}
            </button>
            <button
              onClick={() => openCommentAt(currentTime)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400
                         hover:text-white hover:border-zinc-600 transition-all"
            >
              + 在此处添加批注
            </button>
            <span className="text-xs text-zinc-600 ml-auto">
              快捷键: <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">C</kbd> 批注 · <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">Space</kbd> 播放/暂停
            </span>
          </div>
        </div>

        {/* Comments sidebar */}
        <div className="w-80 shrink-0 border-l border-zinc-900 pl-6">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">
            批注 <span className="text-zinc-600 font-normal">({comments.length})</span>
          </h2>

          {comments.length === 0 ? (
            <div className="text-sm text-zinc-600 py-8 text-center">
              <p className="mb-2">暂无批注</p>
              <p className="text-xs">播放视频，按 <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">C</kbd> 添加</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 scrollbar-thin">
              {comments.map((c, i) => (
                <div
                  key={c.id}
                  className="group p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-lg
                             hover:bg-zinc-900/80 hover:border-zinc-700 transition-all cursor-pointer"
                  onClick={() => seekTo(c.timestamp)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono text-yellow-400/80">
                      {formatTime(c.timestamp)}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      #{i + 1}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{c.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
