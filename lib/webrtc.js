/**
 * WebRTC Live Streaming — Supabase Realtime signaling
 * 
 * Architecture:
 * - Host: captures camera+mic, creates RTCPeerConnection per viewer,
 *   sends SDP offer via Supabase Realtime channel
 * - Viewer: receives offer, creates answer, sends back via Realtime
 * - Both exchange ICE candidates via Realtime
 * 
 * Supabase Realtime is used ONLY for signaling (not media).
 * Media streams directly peer-to-peer via WebRTC.
 * 
 * For a production app with many viewers you would use a media server
 * (like mediasoup or Agora). This implementation works for small audiences.
 */
import { supabase } from './supabase'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

// ── HOST: broadcast camera to all viewers ────────────────────────────────────
export class LiveHost {
  constructor(streamId, localStream, onViewerCount) {
    this.streamId     = streamId
    this.localStream  = localStream   // MediaStream from getUserMedia (video+audio)
    this.peers        = new Map()     // viewerId -> RTCPeerConnection
    this.channel      = null
    this.onViewerCount = onViewerCount || (() => {})
  }

  async start() {
    const channelName = `webrtc-live-${this.streamId}`
    
    this.channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    })

    // Viewer joins — send them an offer
    this.channel.on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
      const { viewerId } = payload
      await this._createPeerForViewer(viewerId)
      this.onViewerCount(this.peers.size)
    })

    // Viewer sends back their answer
    this.channel.on('broadcast', { event: 'viewer-answer' }, async ({ payload }) => {
      const { viewerId, answer } = payload
      const pc = this.peers.get(viewerId)
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
        } catch(e) { console.warn('setRemoteDescription answer:', e) }
      }
    })

    // Viewer sends ICE candidates
    this.channel.on('broadcast', { event: 'viewer-ice' }, async ({ payload }) => {
      const { viewerId, candidate } = payload
      const pc = this.peers.get(viewerId)
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch(e) { console.warn('addIceCandidate (host):', e) }
      }
    })

    // Viewer leaves
    this.channel.on('broadcast', { event: 'viewer-leave' }, ({ payload }) => {
      const { viewerId } = payload
      this._closePeer(viewerId)
      this.onViewerCount(this.peers.size)
    })

    await this.channel.subscribe()
    return this
  }

  async _createPeerForViewer(viewerId) {
    if (this.peers.has(viewerId)) {
      this._closePeer(viewerId)
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.peers.set(viewerId, pc)

    // Add all local tracks (video + audio) to the peer connection
    this.localStream.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream)
    })

    // Send ICE candidates to this viewer as they come
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.channel.send({
          type: 'broadcast',
          event: 'host-ice',
          payload: { viewerId, candidate: candidate.toJSON() }
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this._closePeer(viewerId)
        this.onViewerCount(this.peers.size)
      }
    }

    // Create and send offer to this specific viewer
    const offer = await pc.createOffer({
      offerToReceiveAudio: false,  // host doesn't receive from viewer
      offerToReceiveVideo: false,
    })
    await pc.setLocalDescription(offer)

    this.channel.send({
      type: 'broadcast',
      event: 'host-offer',
      payload: { viewerId, offer: pc.localDescription.toJSON() }
    })
  }

  _closePeer(viewerId) {
    const pc = this.peers.get(viewerId)
    if (pc) { pc.close(); this.peers.delete(viewerId) }
  }

  stop() {
    this.peers.forEach((pc, id) => this._closePeer(id))
    if (this.channel) supabase.removeChannel(this.channel)
    this.channel = null
  }
}

// ── VIEWER: receive host's stream ─────────────────────────────────────────────
export class LiveViewer {
  constructor(streamId, viewerId, onStream) {
    this.streamId  = streamId
    this.viewerId  = viewerId
    this.onStream  = onStream   // callback(MediaStream) — wire to <video>
    this.pc        = null
    this.channel   = null
  }

  async start() {
    const channelName = `webrtc-live-${this.streamId}`

    this.channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    })

    // Host sends an offer specifically to this viewer
    this.channel.on('broadcast', { event: 'host-offer' }, async ({ payload }) => {
      if (payload.viewerId !== this.viewerId) return
      await this._handleOffer(payload.offer)
    })

    // Host sends ICE candidates
    this.channel.on('broadcast', { event: 'host-ice' }, async ({ payload }) => {
      if (payload.viewerId !== this.viewerId) return
      if (this.pc && payload.candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
        } catch(e) { console.warn('addIceCandidate (viewer):', e) }
      }
    })

    await this.channel.subscribe()

    // Announce to host that we joined
    this.channel.send({
      type: 'broadcast',
      event: 'viewer-join',
      payload: { viewerId: this.viewerId }
    })

    return this
  }

  async _handleOffer(offer) {
    if (this.pc) { this.pc.close() }

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // When we get the host's stream track, fire onStream
    this.pc.ontrack = (event) => {
      if (event.streams?.[0]) {
        this.onStream(event.streams[0])
      }
    }

    // Send our ICE candidates to the host
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.channel.send({
          type: 'broadcast',
          event: 'viewer-ice',
          payload: { viewerId: this.viewerId, candidate: candidate.toJSON() }
        })
      }
    }

    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await this.pc.createAnswer()
      await this.pc.setLocalDescription(answer)

      this.channel.send({
        type: 'broadcast',
        event: 'viewer-answer',
        payload: { viewerId: this.viewerId, answer: this.pc.localDescription.toJSON() }
      })
    } catch(e) {
      console.error('WebRTC viewer handleOffer:', e)
    }
  }

  stop() {
    // Tell host we're leaving
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'viewer-leave',
        payload: { viewerId: this.viewerId }
      })
      supabase.removeChannel(this.channel)
      this.channel = null
    }
    if (this.pc) { this.pc.close(); this.pc = null }
  }
}
