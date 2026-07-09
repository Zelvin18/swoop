/** Map MediaEditor result → createPost music/filter fields */

export function filterFromEditor(editorResult) {
  if (!editorResult) return 'Original'
  const perClip = editorResult.perClipFilters
  if (perClip?.length) return perClip[0] || 'Original'
  const clip = editorResult.mediaFiles?.[0]
  if (clip?.filter) return clip.filter
  return 'Original'
}

export function musicFromEditor(editorResult) {
  const track = editorResult?.selectedTrack
  if (!track?.id && !track?.file_url) return { musicStartSec: editorResult?.musicStart || 0 }
  return {
    musicExternalId: track.id != null ? String(track.id) : null,
    musicFileUrl: track.file_url || null,
    musicTitle: track.title || null,
    musicArtist: track.artist || null,
    musicStartSec: editorResult?.musicStart || 0,
  }
}

export function editorMeta(editorResult) {
  return {
    filterName: filterFromEditor(editorResult),
    ...musicFromEditor(editorResult),
  }
}
