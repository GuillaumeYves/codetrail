// Stops runaway loops in learner code, so a half typed condition cannot freeze the page.
import { parser } from '@lezer/javascript'

const LIMIT_MS = 1000
const LOOPS = new Set(['ForStatement', 'WhileStatement', 'DoStatement'])
const COMMENTS = new Set(['LineComment', 'BlockComment'])

export const DEFAULT_LOOP_MESSAGE = 'Loop stopped after 1 second. Check that its condition can become false.'

// Kept on one line so line numbers in error messages match the editor.
const prelude = (message) => `var __ctLoop={n:0,t:0};function __ctGuard(){if(__ctLoop.n++===0){__ctLoop.t=Date.now();setTimeout(function(){__ctLoop.n=0})}else if(__ctLoop.n%1000===0&&Date.now()-__ctLoop.t>${LIMIT_MS}){__ctLoop.n=0;throw new RangeError(${JSON.stringify(message)})}};`

function codeChildren(node) {
  const children = []
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (!COMMENTS.has(child.name)) children.push(child)
  }
  return children
}

// Adds a guard call at the start of every loop body. Code that does not parse is left as is.
export function protectLoops(code, message = DEFAULT_LOOP_MESSAGE) {
  const tree = parser.parse(code)
  const inserts = []
  let broken = false

  tree.iterate({
    enter(ref) {
      if (ref.type.isError) broken = true
      if (!LOOPS.has(ref.name)) return
      const children = codeChildren(ref.node)
      // do { body } while (...) keeps its body second; for and while keep it last.
      const body = ref.name === 'DoStatement' ? children[1] : children.at(-1)
      if (!body) return
      if (body.name === 'Block') inserts.push([body.from + 1, '__ctGuard();'])
      else inserts.push([body.from, '{__ctGuard();'], [body.to, '}'])
    },
  })

  if (broken || !inserts.length) return code
  let result = code
  for (const [at, text] of inserts.sort((a, b) => b[0] - a[0])) result = result.slice(0, at) + text + result.slice(at)
  return prelude(message) + result
}
