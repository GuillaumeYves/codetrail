// Runs learner code, then evaluates the runtime checks against the result.
// Self contained on purpose: the browser sandbox embeds this function's source as a string.
export async function runLessonChecks({ window, document, code, checks, wait = 0 }) {
  const logs = []
  // Same formatting as the preview console.
  const show = (value) => {
    if (typeof value === 'string') return value
    if (value instanceof Error) return String(value)
    try {
      const json = JSON.stringify(value)
      return json === undefined ? String(value) : json
    } catch {
      return String(value)
    }
  }
  const record = (...args) => logs.push(args.map(show).join(' '))
  const learnerConsole = { log: record, info: record, warn: record, error: record, debug: record }
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const same = (a, b) => {
    if (Object.is(a, b)) return true
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every((key) => same(a[key], b[key]))
  }

  let error = null
  let scope = null
  try {
    // Direct eval inside the same function reads the learner's top level bindings.
    const run = new Function('window', 'document', 'console', '__ctScope', `${code}\n;__ctScope((__ctExpression) => eval(__ctExpression))`)
    run(window, document, learnerConsole, (reader) => { scope = reader })
  } catch (caught) {
    error = caught
  }
  await sleep(wait)

  const read = (expression) => {
    if (!scope) throw new ReferenceError('Code did not finish running')
    return scope(expression)
  }
  // Promises get one second to settle.
  const settle = (value) => (value && typeof value.then === 'function'
    ? Promise.race([value, sleep(1000).then(() => { throw new Error('Promise did not settle') })])
    : value)

  const act = (action) => {
    const target = document.querySelector(action.selector)
    if (!target) throw new Error(`Missing ${action.selector}`)
    if (action.type === 'input') {
      target.value = action.value
      target.dispatchEvent(new window.Event('input', { bubbles: true }))
      return null
    }
    const event = new window.Event(action.type, { bubbles: true, cancelable: true })
    target.dispatchEvent(event)
    return event
  }

  const checkValue = async (check) => {
    try {
      const value = await settle(read(check.expression))
      if (check.throws) return false
      if ('equals' in check && !same(value, check.equals)) return false
      if (check.kind) {
        const kind = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value
        if (kind !== check.kind) return false
      }
      if (check.minLength != null && !(value != null && value.length >= check.minLength)) return false
      return true
    } catch (caught) {
      return Boolean(check.throws) && Boolean(caught) && caught.name === check.throws
    }
  }

  const checkLog = (check) => {
    if (check.lines) return same(logs, check.lines.map(String))
    if ('text' in check) return logs.some((line) => line.trim() === String(check.text))
    if (check.expression) {
      try {
        const expected = show(read(check.expression))
        return logs.some((line) => line === expected)
      } catch {
        return false
      }
    }
    if (check.pattern) return logs.some((line) => new RegExp(check.pattern, check.flags).test(line))
    return logs.length >= (check.min ?? 1)
  }

  const checkDom = async (check) => {
    let last = null
    try {
      for (const action of check.actions ?? []) last = act(action)
    } catch {
      return false
    }
    if (check.wait) await sleep(check.wait)
    const found = Array.from(document.querySelectorAll(check.selector))
    const element = found[0]
    if (check.count != null && found.length !== check.count) return false
    if (check.texts && !same(found.map((node) => node.textContent.trim()), check.texts)) return false
    if (!element) return check.count === 0
    if ('text' in check && element.textContent.trim() !== check.text) return false
    if (check.includes && !element.textContent.includes(check.includes)) return false
    if (check.hasClass && !element.classList.contains(check.hasClass)) return false
    if (check.lacksClass && element.classList.contains(check.lacksClass)) return false
    for (const [name, value] of Object.entries(check.attrs ?? {})) {
      if (element.getAttribute(name) !== value) return false
    }
    if ('value' in check && element.value !== check.value) return false
    if (check.prevented && !(last && last.defaultPrevented)) return false
    return true
  }

  const passed = []
  for (const check of checks) {
    if (check.type === 'js-runs') passed.push(!error)
    else if (check.type === 'js-value') passed.push(await checkValue(check))
    else if (check.type === 'js-log') passed.push(checkLog(check))
    else if (check.type === 'js-dom') passed.push(await checkDom(check))
    else passed.push(false)
  }
  return { passed, logs, error: error ? String(error) : null }
}
