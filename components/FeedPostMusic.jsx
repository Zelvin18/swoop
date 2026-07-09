import { useEffect, useRef } from 'react'
import { isFeedUnmuted, markUserUnmuted, subscribeFeedAudio } from '../lib/feedAudio'

/** IG-style mute: starts muted until user unmutes globally */
export function useFeedMute() {
  const mutedRef = useRef(!isFeedUnmuted())

  useEffect(() => {
    return subscribeFeedAudio(unmuted => {
      mutedRef.current = !unmuted
    })
  }, [])

  return {
    get muted() { return !isFeedUnmuted() },
    isMuted: () => !isFeedUnmuted(),
    unmute: () => markUserUnmuted(),
    tryUnmute: (videoEl) => {
      if (!videoEl) return
      markUserUnmuted()
      videoEl.muted = false
    },
  }
}

/** Background music for posts with music_file_url */
export default function FeedPostMusic({ post, isVisible }) {
  const audioRef = useRef(null)

  useEffect(() => {
    const url = post?.music_file_url
    const a = audioRef.current
    if (!url || !a) return

    if (isVisible && isFeedUnmuted()) {
      a.src = url
      a.currentTime = post.music_start_sec || 0
      a.play().catch(() => {})
    } else {
      a.pause()
    }
    return () => { a.pause() }
  }, [isVisible, post?.music_file_url, post?.music_start_sec, isFeedUnmuted()])

  useEffect(() => subscribeFeedAudio(unmuted => {
    const a = audioRef.current
    if (!a || !post?.music_file_url) return
    if (unmuted && isVisible) {
      a.play().catch(() => {})
    } else {
      a.pause()
    }
  }), [isVisible, post?.music_file_url])

  if (!post?.music_file_url) return null
  return <audio ref={audioRef} loop playsInline style={{ display: 'none' }} />
}
