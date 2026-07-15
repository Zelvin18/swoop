import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

export default function MusicPage() {
  const router = useRouter()
  const { id } = router.query
  const [currentUser, setCurrentUser] = useState(null)
  const [music, setMusic] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current user session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null)
    })
  }, [])

  useEffect(() => {
    if (!id) return

    async function loadMusicData() {
      setLoading(true)
      try {
        // Try to fetch music details from music table
        let musicData = null
        try {
          const { data, error } = await supabase
            .from('music')
            .select('*')
            .eq('id', id)
            .single()
          if (!error && data) {
            musicData = data
          }
        } catch (e) {
          // Music table might not exist yet, that's ok
        }

        // If music table lookup failed, try to find posts with this music_file_url
        const postsQuery = supabase
          .from('posts')
          .select(`
            *,
            seller:profiles(*)
          `)
          .eq('music_id', id)
          .order('created_at', { ascending: false })

        let postsData = []
        const { data, error } = await postsQuery
        if (!error && data) {
          postsData = data
        }

        // If no posts found by music_id, try by music_file_url
        if (postsData.length === 0) {
          const { data: postsByUrl, error: urlError } = await supabase
            .from('posts')
            .select(`
              *,
              seller:profiles(*)
            `)
            .eq('music_file_url', id)
            .order('created_at', { ascending: false })
          if (!urlError && postsByUrl) {
            postsData = postsByUrl
          }
        }

        // Create a mock music object from the first post if music table doesn't exist
        if (!musicData && postsData.length > 0) {
          const firstPost = postsData[0]
          musicData = {
            id: id,
            title: firstPost.music_title || 'Unknown Track',
            artist: firstPost.music_artist || 'Unknown Artist',
            album_art: firstPost.music_album_art || null,
            file_url: firstPost.music_file_url || id
          }
        }

        setMusic(musicData)
        setPosts(postsData || [])
      } catch (error) {
        console.error('Error loading music data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMusicData()
  }, [id])

  if (loading) {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{
          width: 56,
          height: 56,
          background: 'linear-gradient(135deg,#D946EF,#FF3366,#FB923C)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          color: 'white',
          animation: 'spin 1s linear infinite'
        }}>♪</div>
        <div style={{ color: '#52525B', fontSize: 14 }}>Loading music...</div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!music) {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ fontSize: 60 }}>🎵</div>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>Music not found</div>
        <button
          onClick={() => router.back()}
          style={{
            padding: '12px 24px',
            background: '#FF3366',
            color: 'white',
            border: 'none',
            borderRadius: 24,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: '#000', minHeight: '100dvh', paddingBottom: 100 }}>
      {/* Header with back button */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'white',
            fontSize: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ←
        </button>
        <div style={{
          color: 'white',
          fontSize: 16,
          fontWeight: 700
        }}>
          {music.title}
        </div>
      </div>

      {/* Music info section */}
      <div style={{
        padding: '24px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Large album art */}
        <div style={{
          width: 120,
          height: 120,
          borderRadius: 16,
          overflow: 'hidden',
          background: 'linear-gradient(135deg,#FF3366,#F97316)',
          flexShrink: 0,
          boxShadow: '0 8px 32px rgba(255,51,102,0.3)'
        }}>
          {music.album_art ? (
            <img
              src={music.album_art}
              alt="Album art"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48
            }}>🎵</div>
          )}
        </div>

        {/* Music details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: 'white',
            fontSize: 20,
            fontWeight: 800,
            marginBottom: 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {music.title}
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 15,
            marginBottom: 16,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {music.artist || 'Unknown Artist'}
          </div>
          
          {/* Use this sound button */}
          <button
            onClick={() => router.push('/')}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: 'linear-gradient(135deg,#FF3366,#F97316)',
              color: 'white',
              border: 'none',
              borderRadius: 24,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255,51,102,0.4)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            Use this sound
          </button>
        </div>
      </div>

      {/* Posts count */}
      <div style={{
        padding: '16px 20px',
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontWeight: 600
      }}>
        {posts.length} {posts.length === 1 ? 'post' : 'posts'}
      </div>

      {/* Posts grid */}
      <div style={{ padding: '0 20px' }}>
        {posts.length === 0 ? (
          <div style={{
            height: '40dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ fontSize: 60 }}>🎬</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', padding: '0 32px' }}>
              No posts using this sound yet. Be the first to create one!
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8
          }}>
            {posts.map(post => (
              <div
                key={post.id}
                onClick={() => router.push(`/post/${post.id}`)}
                style={{
                  aspectRatio: '9/16',
                  borderRadius: 8,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative',
                  background: '#1a1a1a'
                }}
              >
                {post.video_url ? (
                  <video
                    src={post.video_url}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    muted
                  />
                ) : post.images && post.images.length > 0 ? (
                  <img
                    src={post.images[0]}
                    alt={post.title || 'Post'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    color: 'rgba(255,255,255,0.3)'
                  }}>📷</div>
                )}
                
                {/* Video indicator */}
                {post.video_url && (
                  <div style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
