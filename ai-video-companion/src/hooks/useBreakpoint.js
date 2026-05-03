import { useState, useEffect } from 'react'

const getBreakpoint = () =>
  window.innerWidth >= 1024 ? 'desktop'
  : window.innerWidth >= 768  ? 'tablet'
  : 'mobile'

export function useBreakpoint() {
  const [bp, setBp] = useState(getBreakpoint)
  useEffect(() => {
    const handler = () => setBp(getBreakpoint())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return bp
}
