/**
 * Extract music + filter metadata from editorResult for post creation.
 */
export function editorMeta(editorResult) {
  if (!editorResult) return {}
  const track = editorResult.selectedTrack || null
  return {
    filterName:       editorResult.filter || editorResult.perClipFilters?.[0] || 'Original',
    musicTrackId:     track?.id && !track.id.startsWith('sh-') ? track.id : null,
    musicExternalId:  track?.id || null,
    musicFileUrl:     track?.file_url || null,
    musicTitle:       track?.title || null,
    musicArtist:      track?.artist || null,
    musicStartSec:    editorResult.musicStart || 0,
    textOverlays:     editorResult.textOverlays || [],
  }
}
