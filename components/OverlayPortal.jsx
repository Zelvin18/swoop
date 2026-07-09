import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { hideAppChrome, showAppChrome } from '../lib/overlayChrome'

/** Full-screen overlay in document.body; hides feed nav + bottom nav */
export default function OverlayPortal({ children, hideChrome = true }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (hideChrome) hideAppChrome()
    return () => {
      if (hideChrome) showAppChrome()
    }
  }, [hideChrome])

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
