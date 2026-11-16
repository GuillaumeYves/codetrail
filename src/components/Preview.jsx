import { useEffect, useRef, useState } from 'react'
import { buildPreviewDoc } from '../core/preview.js'

// Sandboxed live preview. Markup and JS edits rebuild the frame after a pause, CSS edits are hot swapped.
export default function Preview({ html, baseCss = '', css = '', js = '', delay = 300, title, onLog, onReload }) {
  const frame = useRef(null)
  const live = useRef({ css, scroll: null, onLog, onReload })
  const built = useRef({ html, baseCss, js })
  const [doc, setDoc] = useState(() => buildPreviewDoc({ html, baseCss, css, js }))

  useEffect(() => {
    live.current.onLog = onLog
    live.current.onReload = onReload
  })

  useEffect(() => {
    const last = built.current
    if (last.html === html && last.baseCss === baseCss && last.js === js) return undefined

    const timer = setTimeout(() => {
      built.current = { html, baseCss, js }
      setDoc(buildPreviewDoc({ html, baseCss, css: live.current.css, js }))
    }, delay)
    return () => clearTimeout(timer)
  }, [html, baseCss, js, delay])

  useEffect(() => {
    live.current.css = css
    frame.current?.contentWindow?.postMessage({ ct: 'css', css }, '*')
  }, [css])

  useEffect(() => {
    const onMessage = (event) => {
      const target = frame.current?.contentWindow
      if (!target || event.source !== target || !event.data?.ct) return

      const { ct, data } = event.data
      if (ct === 'ready') {
        // A fresh document: send the latest CSS and the scroll to restore.
        target.postMessage({ ct: 'init', css: live.current.css, scroll: live.current.scroll }, '*')
        live.current.onReload?.()
      } else if (ct === 'scroll') {
        live.current.scroll = data
      } else if (ct === 'log') {
        live.current.onLog?.(data)
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <iframe
      ref={frame}
      className="preview-frame"
      title={title}
      srcDoc={doc}
      sandbox="allow-scripts allow-forms allow-modals"
    />
  )
}
