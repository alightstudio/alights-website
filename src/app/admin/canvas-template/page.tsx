'use client'

import { useEffect, useState } from 'react'
import { getAllPaintings } from '@/lib/famous-paintings'

interface PaintingTemplate {
  id: string
  title: string
  artist: string
  year: string
}

export default function CanvasTemplateAdmin() {
  const [paintings, setPaintings] = useState<PaintingTemplate[]>([])
  const [current, setCurrent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [paintingsRes, configRes] = await Promise.all([
        fetch('/api/admin/canvas-template').then(r => r.json()),
        fetch('/api/admin/canvas-template').then(r => r.json())
      ])
      
      setPaintings(paintingsRes.paintings || getAllPaintings())
      setCurrent(configRes.current || 'starry-night')
    } catch (e) {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  async function saveTemplate() {
    setSaving(true)
    setError('')
    
    try {
      const res = await fetch('/api/admin/canvas-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: current })
      })
      
      if (!res.ok) throw new Error('保存失败')
      alert('保存成功！新的底稿将在下次随机填充时生效')
    } catch (e) {
      setError('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-white">加载中...</div>

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-light mb-8">画布底稿管理</h1>
      
      {error && (
        <div className="bg-red-900 text-white p-4 rounded mb-6">
          {error}
        </div>
      )}
      
      <div className="max-w-4xl">
        <p className="text-gray-400 mb-6">
          选择画布自动填充时使用的名画底稿。底稿引导比例为 70%，其余 30% 为纯随机填充。
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {paintings.map(p => (
            <div
              key={p.id}
              className={`border p-4 rounded cursor-pointer transition-colors ${
                current === p.id
                  ? 'border-white bg-gray-900'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
              onClick={() => setCurrent(p.id)}
            >
              <div className="aspect-square bg-gray-800 mb-3 rounded flex items-center justify-center text-4xl">
                🎨
              </div>
              <h3 className="font-medium">{p.title}</h3>
              <p className="text-sm text-gray-400">{p.artist} ({p.year})</p>
              {current === p.id && (
                <span className="inline-block mt-2 text-xs bg-white text-black px-2 py-1 rounded">
                  当前选中
                </span>
              )}
            </div>
          ))}
        </div>
        
        <button
          onClick={saveTemplate}
          disabled={saving}
          className="bg-white text-black px-6 py-3 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
        
        <div className="mt-8 p-4 bg-gray-900 rounded">
          <h3 className="font-medium mb-2">当前底稿</h3>
          <p className="text-gray-400">
            {paintings.find(p => p.id === current)?.title || '未知'} - {' '}
            {paintings.find(p => p.id === current)?.artist} ({paintings.find(p => p.id === current)?.year})
          </p>
        </div>
      </div>
    </div>
  )
}
