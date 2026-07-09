/**
 * Global feed audio state — IG/TikTok style:
 * - Videos start muted
 * - Once user unmutes (tap or volume), all subsequent videos stay unmuted
 */

const KEY = 'swoop_feed_unmuted'
const listeners = new Set()

function read() {
  if (typeof window === 'undefined') return false
  try { return sessionStorage.getItem(KEY) === '1' } catch { return false }
}

let unmuted = read()

export function isFeedUnmuted() {
  return unmuted
}

export function setFeedUnmuted(value = true) {
  if (unmuted === value) return
  unmuted = value
  try { sessionStorage.setItem(KEY, value ? '1' : '0') } catch { /* ignore */ }
  listeners.forEach(fn => fn(unmuted))
}

export function subscribeFeedAudio(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Call when user taps unmute or volume-up unmutes a visible video */
export function markUserUnmuted() {
  setFeedUnmuted(true)
}

if (typeof window !== 'undefined') {
  // Best-effort: some mobile browsers surface volume changes
  document.addEventListener('volumechange', () => {
    // No reliable volume read in browser — paired with per-video handlers
  }, true)
}
