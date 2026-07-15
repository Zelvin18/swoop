/**
 * Global audio state manager - Instagram-style feed-wide audio control
 * When one video is unmuted, all videos in the feed should unmute
 */

// Global mute state (true = muted, false = unmuted)
let globalMuted = true

// Callbacks to notify all FeedCard components of mute state changes
const muteStateCallbacks = new Set()

/**
 * Get current global mute state
 */
export function getGlobalMuted() {
  return globalMuted
}

/**
 * Set global mute state and notify all listeners
 */
export function setGlobalMuted(muted) {
  globalMuted = muted
  notifyMuteStateChange()
}

/**
 * Toggle global mute state
 */
export function toggleGlobalMuted() {
  globalMuted = !globalMuted
  notifyMuteStateChange()
  return globalMuted
}

/**
 * Subscribe to global mute state changes
 * @param {function} callback - Function to call when mute state changes
 * @returns {function} Unsubscribe function
 */
export function subscribeToMuteState(callback) {
  muteStateCallbacks.add(callback)
  // Immediately call with current state
  callback(globalMuted)
  return () => {
    muteStateCallbacks.delete(callback)
  }
}

/**
 * Notify all subscribers of mute state change
 */
function notifyMuteStateChange() {
  muteStateCallbacks.forEach(callback => {
    try {
      callback(globalMuted)
    } catch (error) {
      console.error('Error in mute state callback:', error)
    }
  })
}

/**
 * Register a video/audio element for global mute control
 * @param {HTMLVideoElement|HTMLAudioElement} element - The media element
 * @param {boolean} isVideo - Whether this is a video element
 */
export function registerMediaElement(element, isVideo = true) {
  if (!element) return () => {}

  // Apply current global state immediately
  element.muted = globalMuted

  const callback = (muted) => {
    element.muted = muted
  }

  muteStateCallbacks.add(callback)

  return () => {
    muteStateCallbacks.delete(callback)
  }
}
