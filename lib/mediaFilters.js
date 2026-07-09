/**
 * CSS filter strings by filter name — used for canvas export and preview
 */
export const FILTER_MAP = {
  'Original': '',
  'Vivid':    'saturate(1.6) contrast(1.1)',
  'Matte':    'contrast(0.9) saturate(0.8) brightness(1.05)',
  'Cool':     'hue-rotate(20deg) saturate(1.1)',
  'Warm':     'hue-rotate(-15deg) saturate(1.2) brightness(1.05)',
  'Fade':     'contrast(0.85) brightness(1.12) saturate(0.7)',
  'Mono':     'grayscale(1)',
  'Drama':    'contrast(1.35) saturate(1.15) brightness(0.92)',
  'Chrome':   'saturate(0) contrast(1.4) brightness(1.1)',
  'Golden':   'sepia(0.5) saturate(1.3) brightness(1.05)',
  'Noir':     'grayscale(0.8) contrast(1.3) brightness(0.85)',
}

export function getFilterCSS(filterName) {
  return FILTER_MAP[filterName] || ''
}
