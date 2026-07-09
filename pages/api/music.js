/**
 * /api/music — Jamendo proxy with built-in fallback catalog
 * GET /api/music?q=search&genre=pop&limit=40
 */
import { searchCuratedTracks, CURATED_TRACKS } from '../../lib/musicLibrary'

export default async function handler(req, res) {
  const { q = '', genre = '', limit = 40 } = req.query
  const CLIENT_ID = process.env.JAMENDO_CLIENT_ID || ''

  let tracks = []
  let source = 'curated'

  if (CLIENT_ID) {
    try {
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        format: 'json',
        limit: String(Math.min(Number(limit) || 40, 50)),
        order: 'popularity_total_desc',
        include: 'musicinfo',
        audioformat: 'mp32',
      })
      if (q) params.set('namesearch', String(q))
      if (genre && genre !== 'All') params.set('tags', String(genre).toLowerCase().replace(/-/g, ''))

      const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Swoop/1.0' },
      })
      const data = await response.json()

      if (data.headers?.status === 'success' && data.results?.length) {
        tracks = data.results.map(t => ({
          id: String(t.id),
          title: t.name,
          artist: t.artist_name,
          file_url: t.audio || t.audiodownload || '',
          duration_sec: Number(t.duration) || 0,
          cover_url: t.album_image || t.image || null,
          genre: t.musicinfo?.tags?.genres?.[0] || genre || 'Music',
        })).filter(t => t.file_url)
        source = 'jamendo'
      }
    } catch (err) {
      console.error('Jamendo fetch failed:', err.message)
    }
  }

  if (!tracks.length) {
    tracks = searchCuratedTracks({ q: String(q), genre: String(genre), limit: Number(limit) || 40 })
    if (!tracks.length && (q || (genre && genre !== 'All'))) {
      tracks = CURATED_TRACKS.slice(0, Number(limit) || 40)
    }
    source = 'curated'
  }

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate')
  res.json({ tracks, total: tracks.length, source })
}
