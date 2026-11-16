// Runs lesson checks in a hidden sandboxed frame: a real DOM, cut off from the app.
import { runLessonChecks } from './runner.js'

const TIMEOUT_MS = 4000

const RUNNER = `<script>(() => {
  const run = ${runLessonChecks.toString()}
  addEventListener('message', async (event) => {
    if (event.source !== parent || event.data?.ct !== 'run') return
    let result
    try {
      result = await run({ window, document, code: event.data.code, checks: event.data.checks, wait: event.data.wait })
    } catch (error) {
      result = { passed: [], logs: [], error: String(error) }
    }
    parent.postMessage({ ct: 'result', ...result }, '*')
  })
})()</script>`

// The learner script is sent by message instead, so it runs exactly once.
const pageWithRunner = (html) => {
  const page = html.replace(/<script\b[^>]*\bsrc=["']?(?:\.?\/)?script\.js["']?[^>]*>\s*<\/script>/i, '')
  return /<\/body>/i.test(page) ? page.replace(/<\/body>/i, `${RUNNER}</body>`) : page + RUNNER
}

export function runInSandbox({ html, code, checks, wait }) {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe')
    frame.setAttribute('sandbox', 'allow-scripts')
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;visibility:hidden'

    const finish = (result) => {
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      frame.remove()
      resolve(result)
    }
    const onMessage = (event) => {
      if (event.source === frame.contentWindow && event.data?.ct === 'result') finish(event.data)
    }
    const timer = setTimeout(() => finish({ passed: [], logs: [], error: 'Timed out' }), TIMEOUT_MS)

    window.addEventListener('message', onMessage)
    frame.addEventListener('load', () => frame.contentWindow.postMessage({ ct: 'run', code, checks, wait }, '*'), { once: true })
    frame.srcdoc = pageWithRunner(html)
    document.body.append(frame)
  })
}
