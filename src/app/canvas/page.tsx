'use client'

import { useEffect } from 'react'

export default function CanvasRedirect() {
  useEffect(() => {
    window.location.href = '/lab/canvas'
  }, [])
  return null
}
