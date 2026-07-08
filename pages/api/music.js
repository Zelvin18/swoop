/**
 * /api/music — Proxy for Jamendo API (avoids CORS)
 * Free royalty-free music, no key needed
 * GET /api/music?q=search&genre=pop&limit=40
 */
export default async function handler(req, res) {
  const { q = '', genre = '', limit = 40 } = req.query
  const CLIENT_ID = '57924d00'

  let url = `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=${limit}&audioformat=mp32&order=popularity_total_desc&include=musicinfo`

  if (q)     url += `&namesearch=${encodeURIComponent(q)}`
  if (genre && genre !== 'All') url += `&tags=${encodeURIComponent(genre.toLowerCase())}`

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error(`Jamendo ${response.status}`)
    const data = await response.json()

    const tracks = (data.results || [])
      .filter(t => t.audio)
      .map(t => ({
        id:           String(t.id),
        title:        t.name,
        artist:       t.artist_name,
        file_url:     t.audio,
        duration_sec: t.duration,
        cover_url:    t.album_image || null,
        genre:        t.musicinfo?.tags?.genres?.[0] || genre || 'Music',
      }))

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    res.json({ tracks })
  } catch (err) {
    console.error('Music API error:', err.message)
    res.status(500).json({ tracks: [], error: err.message })
  }
}
