/**
 * WebRTC Live Streaming — Supabase Realtime signaling
 *
 * Host: one RTCPeerConnection per viewer, sends offer via Supabase Broadcast
 * Viewer: receives offer, answers, receives host's MediaStream tracks
 *
 * ICE candidates are queued until remote description is set to prevent drops.
 * STUN only — works on most mobile networks. For symmetric NAT add a TURN server.
 */
import { supabase } from './supabase'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

// ── HOST ─────────────────────────────────────────────────────────────────────
export class LiveHost {
  constructor(streamId, localStream, onViewerCount) {
    this.streamId      = streamId
    this.localStream   = localStream
    this.peers         = new Map()      // viewerId -> RTCPeerConnection
    this.channel       = null
    this.onViewerCount = onViewerCount || (() => {})
  }

  async start() {
    const ch = supabase.channel(`webrtc-${this.streamId}`, {
      config: { broadcast: { self: false } },
    })
    this.channel = ch

    ch.on('broadcast', { event: 'viewer-join'   }, ({ payload }) => this._onViewerJoin(payload))
    ch.on('broadcast', { event: 'viewer-answer' }, ({ payload }) => this._onViewerAnswer(payload))
    ch.on('broadcast', { event: 'viewer-ice'    }, ({ payload }) => this._onViewerIce(payload))
    ch.on('broadcast', { event: 'viewer-leave'  }, ({ payload }) => this._onViewerLeave(payload))

    await ch.subscribe()
    return this
  }

  async _onViewerJoin({ viewerId }) {
    if (!viewerId) return
    // Close any existing connection for this viewer first
    this._closePeer(viewerId)

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.peers.set(viewerId, pc)

    // Add all tracks from the host's camera+mic stream
    this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream))

    // Send ICE candidates as they are gathered
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && this.channel) {
        this.channel.send({
          type: 'broadcast', event: 'host-ice',
          payload: { viewerId, candidate: candidate.toJSON() },
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this._closePeer(viewerId)
        this.onViewerCount(this.peers.size)
      }
    }

    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      if (this.channel) {
        this.channel.send({
          type: 'broadcast', event: 'host-offer',
          payload: { viewerId, offer: pc.localDescription.toJSON() },
        })
      }
    } catch(e) { console.error('host createOffer:', e) }

    this.onViewerCount(this.peers.size)
  }

  async _onViewerAnswer({ viewerId, answer }) {
    const pc = this.peers.get(viewerId)
    if (!pc) return
    if (pc.signalingState === 'have-local-offer') {
      try { await pc.setRemoteDescription(new RTCSessionDescription(answer)) }
      catch(e) { console.warn('host setRemoteDescription:', e) }
    }
  }

  async _onViewerIce({ viewerId, candidate }) {
    const pc = this.peers.get(viewerId)
    if (!pc || !candidate) return
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) }
    catch(e) { /* candidate arrived before remote desc — safely ignorable */ }
  }

  _onViewerLeave({ viewerId }) {
    this._closePeer(viewerId)
    this.onViewerCount(this.peers.size)
  }

  _closePeer(viewerId) {
    const pc = this.peers.get(viewerId)
    if (pc) { try { pc.close() } catch(_) {} this.peers.delete(viewerId) }
  }

  stop() {
    this.peers.forEach((_, id) => this._closePeer(id))
    if (this.channel) { supabase.removeChannel(this.channel); this.channel = null }
  }
}

// ── VIEWER ───────────────────────────────────────────────────────────────────
export class LiveViewer {
  constructor(streamId, viewerId, onStream) {
    this.streamId  = streamId
    this.viewerId  = viewerId
    this.onStream  = onStream     // (MediaStream) => void  — wire to <video>
    this.pc        = null
    this.channel   = null
    this._iceBuf   = []           // buffer candidates until remote desc is set
    this._hasRemote = false
  }

  async start() {
    const ch = supabase.channel(`webrtc-${this.streamId}`, {
      config: { broadcast: { self: false } },
    })
    this.channel = ch

    ch.on('broadcast', { event: 'host-offer' }, ({ payload }) => {
      if (payload.viewerId === this.viewerId) this._handleOffer(payload.offer)
    })
    ch.on('broadcast', { event: 'host-ice' }, ({ payload }) => {
      if (payload.viewerId === this.viewerId) this._handleHostIce(payload.candidate)
    })

    await ch.subscribe()

    // Tell host we've joined — they'll send us an offer
    ch.send({ type: 'broadcast', event: 'viewer-join', payload: { viewerId: this.viewerId } })

    return this
  }

  async _handleOffer(offer) {
    if (this.pc) { try { this.pc.close() } catch(_) {} }
    this._iceBuf = []
    this._hasRemote = false

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.pc = pc

    // Receive host's video+audio tracks
    pc.ontrack = (event) => {
      if (event.streams?.[0]) this.onStream(event.streams[0])
    }

    // Send our ICE candidates to the host
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && this.channel) {
        this.channel.send({
          type: 'broadcast', event: 'viewer-ice',
          payload: { viewerId: this.viewerId, candidate: candidate.toJSON() },
        })
      }
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      this._hasRemote = true

      // Flush any buffered host ICE candidates
      for (const c of this._iceBuf) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch(_) {}
      }
      this._iceBuf = []

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      if (this.channel) {
        this.channel.send({
          type: 'broadcast', event: 'viewer-answer',
          payload: { viewerId: this.viewerId, answer: pc.localDescription.toJSON() },
        })
      }
    } catch(e) { console.error('viewer handleOffer:', e) }
  }

  async _handleHostIce(candidate) {
    if (!candidate) return
    if (!this._hasRemote) {
      // Queue until remote description is set
      this._iceBuf.push(candidate)
      return
    }
    if (this.pc) {
      try { await this.pc.addIceCandidate(new RTCIceCandidate(candidate)) }
      catch(_) {}
    }
  }

  stop() {
    if (this.channel) {
      try {
        this.channel.send({
          type: 'broadcast', event: 'viewer-leave',
          payload: { viewerId: this.viewerId },
        })
      } catch(_) {}
      supabase.removeChannel(this.channel)
      this.channel = null
    }
    if (this.pc) { try { this.pc.close() } catch(_) {} this.pc = null }
    this._iceBuf = []
  }
}
