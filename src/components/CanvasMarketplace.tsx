'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Canvas {
  id: string
  width: number
  height: number
  name: string | null
  status: string
}

interface Listing {
  id: string
  canvasId: string
  sellerId: string
  sellerName: string
  status: string
  startPrice: number
  currentBid: number | null
  bidderId: string | null
  endTime: string
  createdAt: string
  canvas: Canvas | null
}

interface Props {
  userId: string | null
  points: number
}

const BURN_RATE = 0.05

export default function CanvasMarketplace({ userId, points }: Props) {
  const [listings, setListings] = useState<Listing[]>([])
  const [myArchived, setMyArchived] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'market' | 'my'>('market')
  const [price, setPrice] = useState(10)
  const [selectedCanvas, setSelectedCanvas] = useState('')
  const [msg, setMsg] = useState('')
  const [totalBurned, setTotalBurned] = useState(0)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    Promise.all([
      fetch('/api/market/listings').then(r => r.json()),
      fetch('/api/canvas/history').then(r => r.json()),
      fetch('/api/stats').then(r => r.json()).catch(() => ({})),
    ]).then(([listingsRes, historyRes, statsRes]) => {
      setListings(listingsRes.listings || [])
      const canList = (historyRes.canvases || []).filter(
        (c: any) => c.ownerId === userId && !(listingsRes.listings || []).find((l: Listing) => l.canvasId === c.id && l.status === 'ACTIVE')
      )
      setMyArchived(canList)
      setTotalBurned(statsRes.totalBurned || 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [userId])

  const handleList = async () => {
    if (!userId || !selectedCanvas) return
    const res = await fetch('/api/market/listings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, canvasId: selectedCanvas, startPrice: price }),
    })
    if (res.ok) {
      setMsg('✅ 上架成功！')
      setSelectedCanvas('')
      setPrice(10)
      location.reload()
    } else {
      const data = await res.json()
      setMsg('❌ ' + (data.error || '上架失败'))
    }
  }

  const handleBuy = async (listingId: string) => {
    if (!userId) return setMsg('请先登录')
    const res = await fetch('/api/market/buy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, listingId }),
    })
    if (res.ok) { setMsg('🎉 购买成功！'); location.reload() }
    else { const data = await res.json(); setMsg('❌ ' + (data.error || '购买失败')) }
  }

  const handleCancel = async (listingId: string) => {
    if (!userId) return
    const res = await fetch('/api/market/listings', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, listingId }),
    })
    if (res.ok) { setMsg('✅ 已取消上架'); location.reload() }
    else { const data = await res.json(); setMsg('❌ ' + (data.error || '取消失败')) }
  }

  if (!userId) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        请<Link href="/login" className="text-accent-gold/70 hover:underline">登录</Link>后使用交易市场
      </div>
    )
  }

  if (loading) {
    return <div className="animate-pulse space-y-4 py-8">
      <div className="h-4 w-32 bg-dark-700 rounded" />
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-dark-700 rounded" />)}
    </div>
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">你的积分：<span className="text-accent-gold/70 font-mono">{points}</span></p>
        <p className="text-xs text-gray-700">🔥 已烧毁 {totalBurned} 积分</p>
      </div>

      {msg && <div className="mb-4 p-3 bg-dark-800 border border-dark-600 rounded text-sm text-gray-300">{msg}</div>}

      <div className="flex space-x-1 mb-5 border-b border-dark-700">
        <button onClick={() => setTab('market')}
          className={`px-5 py-2.5 text-sm tracking-wide transition-colors ${tab === 'market' ? 'text-white border-b border-white' : 'text-gray-500 hover:text-gray-300'}`}
        >在售画布</button>
        <button onClick={() => setTab('my')}
          className={`px-5 py-2.5 text-sm tracking-wide transition-colors ${tab === 'my' ? 'text-white border-b border-white' : 'text-gray-500 hover:text-gray-300'}`}
        >我的上架</button>
      </div>

      {tab === 'market' ? (
        <>
          {listings.filter(l => l.status === 'ACTIVE').length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm border border-dark-800/50">
              <p className="mb-2">暂无在售画布</p>
              <p className="text-xs">去画板创作，归档后即可上架</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.filter(l => l.status === 'ACTIVE').map(listing => (
                <div key={listing.id} className="bg-dark-800/30 border border-dark-700 rounded-lg p-4 hover:border-dark-500 transition">
                  <div className="aspect-square bg-dark-900/50 rounded mb-3 flex items-center justify-center text-gray-600 text-sm">
                    {listing.canvas ? `${listing.canvas.width}×${listing.canvas.height}` : '画布'}
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-400">{listing.canvas?.name || `画布 #${listing.canvasId.slice(0, 8)}`}</p>
                    <p className="text-gray-600 text-xs mt-1">卖家：{listing.sellerName}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-lg text-white/80">
                        {listing.currentBid || listing.startPrice} <span className="text-xs text-gray-500">积分</span>
                      </span>
                      {userId !== listing.sellerId && (
                        <div className="flex flex-col items-end gap-1">
                          <button onClick={() => handleBuy(listing.id)}
                            className="px-3 py-1 bg-accent-gold/10 hover:bg-accent-gold/20 text-accent-gold/80 rounded text-xs transition"
                          >购买</button>
                          <span className="text-[10px] text-gray-700">燃烧 {Math.floor((listing.currentBid || listing.startPrice) * BURN_RATE)}</span>
                        </div>
                      )}
                      {userId === listing.sellerId && <span className="text-xs text-gray-600">你的上架</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="bg-dark-800/30 border border-dark-700 rounded-lg p-5 mb-6">
            <h3 className="text-sm text-gray-400 mb-4">上架你的画布</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">选择画布</label>
                <select value={selectedCanvas} onChange={e => setSelectedCanvas(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded px-3 py-2 text-sm text-white"
                >
                  <option value="">-- 选择 --</option>
                  {myArchived.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name || `画布 #${c.id.slice(0, 8)}`} ({c.width}×{c.height})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">售价（积分）</label>
                <input type="number" min={1} value={price} onChange={e => setPrice(parseInt(e.target.value) || 10)}
                  className="w-full bg-dark-900 border border-dark-600 rounded px-3 py-2 text-sm text-white" />
              </div>
              <button onClick={handleList} disabled={!selectedCanvas}
                className="w-full py-2 bg-accent-gold/10 hover:bg-accent-gold/20 text-accent-gold/80 rounded text-sm transition disabled:opacity-30"
              >确认上架</button>
            </div>
          </div>
          <h3 className="text-xs text-gray-600 mb-2">我的在售</h3>
          {listings.filter(l => l.sellerId === userId).length === 0 ? (
            <p className="text-gray-600 text-sm">暂无在售</p>
          ) : (
            listings.filter(l => l.sellerId === userId).map(listing => (
              <div key={listing.id} className="flex items-center justify-between bg-dark-800/20 border border-dark-800 rounded p-3 text-sm mb-1">
                <div>
                  <span className="text-gray-400">{listing.canvas?.name || `画布 #${listing.canvasId.slice(0, 8)}`}</span>
                  <span className={`ml-3 text-xs ${listing.status === 'ACTIVE' ? 'text-green-400/60' : listing.status === 'SOLD' ? 'text-blue-400/60' : 'text-red-400/60'}`}>
                    {listing.status === 'ACTIVE' ? '在售' : listing.status === 'SOLD' ? '已售' : '已取消'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">{listing.currentBid || listing.startPrice} 积分</span>
                  {listing.status === 'ACTIVE' && (
                    <button onClick={() => handleCancel(listing.id)}
                      className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded text-xs transition"
                    >取消</button>
                  )}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}
