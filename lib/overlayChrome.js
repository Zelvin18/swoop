/** Hide fixed app chrome (feed nav, search, bottom nav) when a full-screen overlay is open */

const SELECTORS = ['.feed-top-nav', '.feed-search-icon', '.bottom-nav']

export function hideAppChrome() {
  SELECTORS.forEach(sel => {
    const el = document.querySelector(sel)
    if (el && el.style.display !== 'none') {
      el.dataset.swoopPrevDisplay = el.style.display || ''
      el.style.display = 'none'
    }
  })
}

export function showAppChrome() {
  SELECTORS.forEach(sel => {
    const el = document.querySelector(sel)
    if (el && 'swoopPrevDisplay' in el.dataset) {
      el.style.display = el.dataset.swoopPrevDisplay
      delete el.dataset.swoopPrevDisplay
    }
  })
}
