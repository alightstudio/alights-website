'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CONTACT } from '@/lib/site-constants'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '您好！我是栖光文化的 AI 助手。我可以帮您了解我们的服务、作品案例，或者解答关于影视制作的问题。请问有什么可以帮您的？',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    // 使用 functional update 避免闭包 stale：messages 在 fetch 时已是最新状态
    setMessages(prev => {
      const newMessages = [...prev, userMessage]
      // 立即发送，不要 await
      void fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
        .then(res => res.json())
        .then(data => {
          setMessages(msgs => [
            ...msgs,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: data.response || `抱歉，我暂时无法回答。您可拨打 ${CONTACT.phone} 联系我们。`,
              timestamp: new Date(),
            },
          ])
        })
        .catch(() => {
          setMessages(msgs => [
            ...msgs,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `抱歉，服务暂时不可用。请拨打 ${CONTACT.phone} 或邮件至 ${CONTACT.email} 联系。`,
              timestamp: new Date(),
            },
          ])
        })
      return newMessages
    })
    setInput('')
    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const quickReplies = [
    '你们做什么类型的视频？',
    '制作周期多久？',
    '怎么收费？',
    '能看一下案例吗？',
  ]

  return (
    <>
      {/* 悬浮按钮 */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: 'spring' }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full bg-accent-gold/20 border border-accent-gold/40 flex items-center justify-center hover:bg-accent-gold/30 transition-colors shadow-lg backdrop-blur-sm"
      >
        <svg className="w-6 h-6 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </motion.button>

      {/* 聊天窗口 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-dark-900/60 backdrop-blur-sm z-50 md:hidden"
            />

            {/* 聊天面板 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-24 right-4 md:right-8 z-50 w-[calc(100vw-2rem)] md:w-[400px] h-[500px] bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* 头部 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600 bg-dark-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-gold/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">AI 助手</h3>
                    <p className="text-xs text-gray-500">栖光文化 · 在线</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-dark-600 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 消息区域 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-accent-gold/20 text-white rounded-br-md'
                          : 'bg-dark-700 text-gray-300 rounded-bl-md'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-dark-700 px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 快捷回复 */}
              {messages.length < 3 && (
                <div className="px-4 py-2 border-t border-dark-600/50">
                  <p className="text-xs text-gray-500 mb-2">常见问题</p>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply}
                        onClick={() => {
                          setInput(reply)
                          inputRef.current?.focus()
                        }}
                        className="text-xs px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-full text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 输入区域 */}
              <div className="p-4 border-t border-dark-600 bg-dark-700/30">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入您的问题..."
                    className="flex-1 bg-dark-800 border border-dark-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-accent-gold/50 focus:outline-none transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="px-4 py-2.5 bg-accent-gold/20 border border-accent-gold/40 rounded-xl text-accent-gold hover:bg-accent-gold/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  AI 生成内容仅供参考
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
