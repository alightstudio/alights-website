'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Lang = 'zh' | 'en'

interface LangContextType {
  lang: Lang
  toggleLang: () => void
  setLang: (l: Lang) => void
}

const LangContext = createContext<LangContextType>({
  lang: 'zh',
  toggleLang: () => {},
  setLang: () => {},
})

export function useLang() {
  return useContext(LangContext)
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh')

  useEffect(() => {
    const saved = localStorage.getItem('alights_lang') as Lang | null
    if (saved === 'en' || saved === 'zh') {
      setLangState(saved)
    }
  }, [])

  const toggleLang = () => {
    setLangState(prev => {
      const next = prev === 'zh' ? 'en' : 'zh'
      localStorage.setItem('alights_lang', next)
      return next
    })
  }

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('alights_lang', l)
  }

  return (
    <LangContext.Provider value={{ lang, toggleLang, setLang }}>
      {children}
    </LangContext.Provider>
  )
}
