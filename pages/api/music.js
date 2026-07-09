/**
 * /api/music — Proxy for Jamendo API (avoids CORS)
 * GET /api/music?q=search&genre=pop&limit=40
 */
export default async function handler(req, res) {
  const { q = '', genre = '', limit = 40 } = req.query
  const CLIENT_ID = '57924d00'

  // Jamendo v3 tracks endpoint with audio streaming URL
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    format: 'json',
    limit: String(limit),
    order: 'popularity_total_desc',
    include: 'musicinfo',
    audioformat: 'mp31',   // mp31 = 96kbps, most widely available
    speed: 'medium',
  })
  if (q)                        params.set('namesearch', q)
  if (genre && genre !== 'All') params.set('tags', genre.toLowerCase().replace('-', ''))

  const url = `https://api.jamendo.com/v3.0/tracks/?${params}`

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Swoop/1.0' },
    })
    if (!response.ok) {
      const text = await response.text()
      console.error('Jamendo error:', response.status, text.slice(0, 200))
      throw new Error(`Jamendo ${response.status}`)
    }
    const data = await response.json()

    if (data.headers?.status !== 'success') {
      console.error('Jamendo API error:', data.headers)
      throw new Error(data.headers?.error_message || 'Jamendo API error')
    }

    const tracks = (data.results || []).map(t => ({
      id:           String(t.id),
      title:        t.name,
      artist:       t.artist_name,
      // audio is the streaming URL (mp3)
      file_url:     t.audio || t.audiodownload || '',
      duration_sec: Number(t.duration) || 0,
      cover_url:    t.album_image || t.image || null,
      genre:        t.musicinfo?.tags?.genres?.[0] || genre || 'Music',
    })).filter(t => t.file_url)

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate')
    res.json({ tracks, total: data.headers?.results_count || tracks.length })
  } catch (err) {
    console.error('Music API error:', err.message)
    // Return empty rather than 500 so UI shows helpful message
    res.json({ tracks: [], error: err.message })
  }
}
