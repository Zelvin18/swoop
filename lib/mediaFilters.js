/** CSS filters applied in MediaEditor — reused when rendering posts in feed */

export const MEDIA_FILTERS = [
  { name: 'Original', css: '' },
  { name: 'Vivid',    css: 'saturate(1.6) contrast(1.1)' },
  { name: 'Matte',    css: 'contrast(0.9) saturate(0.8) brightness(1.05)' },
  { name: 'Cool',     css: 'hue-rotate(20deg) saturate(1.1)' },
  { name: 'Warm',     css: 'hue-rotate(-15deg) saturate(1.2) brightness(1.05)' },
  { name: 'Fade',     css: 'contrast(0.85) brightness(1.12) saturate(0.7)' },
  { name: 'Mono',     css: 'grayscale(1)' },
  { name: 'Drama',    css: 'contrast(1.35) saturate(1.15) brightness(0.92)' },
  { name: 'Chrome',   css: 'saturate(0) contrast(1.4) brightness(1.1)' },
  { name: 'Golden',   css: 'sepia(0.5) saturate(1.3) brightness(1.05)' },
  { name: 'Noir',     css: 'grayscale(0.8) contrast(1.3) brightness(0.85)' },
]

export function getFilterCSS(name) {
  return MEDIA_FILTERS.find(f => f.name === (name || 'Original'))?.css || ''
}
