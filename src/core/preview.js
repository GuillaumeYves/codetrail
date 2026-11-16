// Builds the srcdoc document rendered by the sandboxed preview frame.

// Runs inside the frame: hot swaps CSS, restores scroll, forwards console output.
const RUNTIME = `(() => {
  const post = (ct, data) => parent.postMessage({ ct, data }, '*')
  const show = (value) => {
    if (typeof value === 'string') return value
    if (value instanceof Error) return value.stack || String(value)
    if (value instanceof Node) return value.outerHTML ? value.outerHTML.slice(0, 300) : value.nodeName
    try { return JSON.stringify(value) ?? String(value) } catch { return String(value) }
  }
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    const original = console[level]
    console[level] = (...args) => {
      post('log', { level, text: args.map(show).join(' ') })
      original.apply(console, args)
    }
  }
  addEventListener('error', (event) => post('log', { level: 'error', text: event.message }))
  addEventListener('unhandledrejection', (event) => post('log', { level: 'error', text: 'Uncaught (in promise) ' + show(event.reason) }))

  let css = null
  let scroll = null
  let timer = 0
  const applyCss = () => {
    const style = document.getElementById('__ct-css')
    if (style && css !== null && style.textContent !== css) style.textContent = css
  }
  const restore = () => scroll && scrollTo(scroll[0], scroll[1])
  addEventListener('message', (event) => {
    const data = event.source === parent && event.data
    if (!data || !data.ct) return
    if (typeof data.css === 'string') { css = data.css; applyCss() }
    if (data.ct === 'init' && data.scroll) { scroll = data.scroll; if (document.readyState === 'complete') restore() }
  })
  addEventListener('DOMContentLoaded', applyCss)
  addEventListener('load', restore)
  addEventListener('scroll', () => {
    clearTimeout(timer)
    timer = setTimeout(() => post('scroll', [scrollX, scrollY]), 120)
  }, { passive: true })

  // Keep the preview on the page: no navigation away, no real form posts.
  addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('a[href]')
    if (link && !link.getAttribute('href').startsWith('#')) event.preventDefault()
  })
  addEventListener('submit', (event) => event.preventDefault())
  post('ready')
})()`

// Workspace files referenced from markup are inlined instead of fetched.
const STYLE_LINK = /<link\b[^>]*\bhref\s*=\s*["']?(?:\.?\/)?styles\.css\b[^>]*>/gi
const SCRIPT_TAG = /<script\b[^>]*\bsrc\s*=\s*["']?(?:\.?\/)?(?:script|index)\.js\b[^>]*>\s*<\/script\s*>/gi

// Stops user code from closing the element it is embedded in.
const escapeClosing = (code, tag) => String(code).replace(new RegExp(`</(${tag})`, 'gi'), '<\\/$1')

// Replaces the first match and removes the rest.
function swapFirst(source, pattern, replacement) {
  let found = false
  const output = source.replace(pattern, () => {
    if (found) return ''
    found = true
    return replacement
  })
  return [output, found]
}

function insertAt(source, pattern, text, after = true) {
  const match = pattern.exec(source)
  if (!match) return null
  const index = after ? match.index + match[0].length : match.index
  return source.slice(0, index) + text + source.slice(index)
}

export function buildPreviewDoc({ html = '', baseCss = '', css = '', js = '' }) {
  const userStyle = `<style id="__ct-css">${escapeClosing(css, 'style')}</style>`
  const userScript = js.trim() ? `<script>${escapeClosing(js, 'script')}\n</script>` : ''
  const [withStyle, styled] = swapFirst(String(html), STYLE_LINK, userStyle)
  const [withScript, scripted] = swapFirst(withStyle, SCRIPT_TAG, userScript)

  // Runtime and base styles go first so learner styles always win.
  const head = `<script>${RUNTIME}</script>`
    + (baseCss ? `<style>${escapeClosing(baseCss, 'style')}</style>` : '')
    + (styled ? '' : userStyle)
  let doc = insertAt(withScript, /<head\b[^>]*>/i, head)
    ?? insertAt(withScript, /<html\b[^>]*>/i, head)
    ?? insertAt(withScript, /<!doctype[^>]*>/i, head)
    ?? head + withScript

  if (userScript && !scripted) doc = insertAt(doc, /<\/body\s*>/i, userScript, false) ?? doc + userScript
  return /^\s*<!doctype/i.test(doc) ? doc : `<!doctype html>\n${doc}`
}
