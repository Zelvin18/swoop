/**
 * Global media playback manager
 * Pauses all audio/video when navigating away from feed
 */
const listeners = new Set()

export function pauseAllMedia() {
  // Pause all video elements
  document.querySelectorAll('video').forEach(video => {
    video.pause()
    video.muted = true
  })
  
  // Pause all audio elements
  document.querySelectorAll('audio').forEach(audio => {
    audio.pause()
  })
  
  // Notify listeners
  listeners.forEach(fn => fn('pause'))
}

export function resumeVisibleMedia() {
  // Resume only visible videos/audio in feed cards
  const feedCards = document.querySelectorAll('.feed-card')
  feedCards.forEach(card => {
    const video = card.querySelector('video')
    const audio = card.querySelector('audio')
    
    if (video && !video.paused) {
      video.play().catch(() => {})
    }
    if (audio && card.dataset.musicUrl) {
      audio.play().catch(() => {})
    }
  })
  
  listeners.forEach(fn => fn('resume'))
}

export function subscribeMediaPlayback(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
