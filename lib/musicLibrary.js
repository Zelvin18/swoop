/**
 * Built-in royalty-free music catalog — works without Jamendo API key.
 * Tracks are direct-stream MP3 URLs (SoundHelix + Pixabay CDN samples).
 */

export const MUSIC_GENRES = ['All', 'Pop', 'Electronic', 'Ambient', 'Hip-Hop', 'Rock', 'Jazz', 'Classical']

export const CURATED_TRACKS = [
  { id: 'sh-1', title: 'Upbeat Energy', artist: 'SoundHelix', genre: 'Pop', duration_sec: 372, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'sh-2', title: 'Summer Vibes', artist: 'SoundHelix', genre: 'Pop', duration_sec: 425, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'sh-3', title: 'Night Drive', artist: 'SoundHelix', genre: 'Electronic', duration_sec: 348, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'sh-4', title: 'Chill Wave', artist: 'SoundHelix', genre: 'Ambient', duration_sec: 390, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'sh-5', title: 'City Lights', artist: 'SoundHelix', genre: 'Electronic', duration_sec: 310, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
  { id: 'sh-6', title: 'Golden Hour', artist: 'SoundHelix', genre: 'Pop', duration_sec: 280, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
  { id: 'sh-7', title: 'Deep Focus', artist: 'SoundHelix', genre: 'Ambient', duration_sec: 420, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
  { id: 'sh-8', title: 'Street Beat', artist: 'SoundHelix', genre: 'Hip-Hop', duration_sec: 305, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  { id: 'sh-9', title: 'Rock Anthem', artist: 'SoundHelix', genre: 'Rock', duration_sec: 340, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
  { id: 'sh-10', title: 'Smooth Jazz', artist: 'SoundHelix', genre: 'Jazz', duration_sec: 360, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
  { id: 'sh-11', title: 'Classical Mood', artist: 'SoundHelix', genre: 'Classical', duration_sec: 400, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3' },
  { id: 'sh-12', title: 'Festival Drop', artist: 'SoundHelix', genre: 'Electronic', duration_sec: 295, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' },
  { id: 'sh-13', title: 'Morning Coffee', artist: 'SoundHelix', genre: 'Ambient', duration_sec: 330, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' },
  { id: 'sh-14', title: 'Hype Mode', artist: 'SoundHelix', genre: 'Hip-Hop', duration_sec: 315, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3' },
  { id: 'sh-15', title: 'Sunset Groove', artist: 'SoundHelix', genre: 'Pop', duration_sec: 350, cover_url: null, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3' },
]

export function searchCuratedTracks({ q = '', genre = 'All', limit = 40 } = {}) {
  let list = [...CURATED_TRACKS]
  const query = q.trim().toLowerCase()
  if (genre && genre !== 'All') {
    list = list.filter(t => t.genre.toLowerCase() === genre.toLowerCase())
  }
  if (query) {
    list = list.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.artist.toLowerCase().includes(query) ||
      t.genre.toLowerCase().includes(query)
    )
  }
  return list.slice(0, limit)
}
