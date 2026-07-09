import { useState, useEffect, useRef, useCallback } from 'react'
import { isFeedUnmuted, markUserUnmuted, subscribeFeedAudio } from './feedAudio'

/** IG/TikTok-style video: autoplay in view, global unmute persists across posts */
export function useFeedVideo(isVideo) {
  const cardRef = useRef(null)
  const videoRef = useRef(null)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(() => !isFeedUnmuted())
  const [visible, setVisible] = useState(false)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => subscribeFeedAudio(unmuted => setMuted(!unmuted)), [])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !isVideo) return
    if (paused || !visible) v.pause()
    else v.play().catch(() => {})
  }, [paused, visible, isVideo])

  // Autoplay when in viewport
  useEffect(() => {
    const v = videoRef.current
    const card = cardRef.current
    if (!v || !card || !isVideo) return

    const onVolChange = () => {
      if (!document.hidden && !v.muted) markUserUnmuted()
    }
    v.addEventListener('volumechange', onVolChange)

    const obs = new IntersectionObserver(([e]) => {
      const inView = e.isIntersecting && e.intersectionRatio >= 0.55
      setVisible(inView)
      if (inView) {
        v.play().catch(() => {})
        setPaused(false)
        if (isFeedUnmuted()) {
          v.muted = false
          setMuted(false)
        }
      } else {
        v.pause()
        if (!isFeedUnmuted()) {
          v.muted = true
          setMuted(true)
        }
      }
    }, { threshold: [0, 0.55, 0.9] })

    obs.observe(card)
    return () => { obs.disconnect(); v.removeEventListener('volumechange', onVolChange) }
  }, [isVideo])

  const tapUnmute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    markUserUnmuted()
    v.muted = false
    setMuted(false)
  }, [])

  const togglePause = useCallback(() => {
    if (muted && isVideo) { tapUnmute(); return }
    setPaused(p => !p)
  }, [muted, isVideo, tapUnmute])

  return {
    cardRef, videoRef, paused, setPaused, muted, visible,
    videoError, setVideoError, tapUnmute, togglePause,
  }
}
