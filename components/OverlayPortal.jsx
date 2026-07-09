import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { hideAppChrome, showAppChrome } from '../lib/overlayChrome'

/** Full-screen overlay in document.body; hides feed nav + bottom nav */
export default function OverlayPortal({ children, hideChrome = true }) {
  useEffect(() => {
    if (!hideChrome) return undefined
    hideAppChrome()
    return () => showAppChrome()
  }, [hideChrome])

  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
