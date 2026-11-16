// JavaScript checks. Syntax checks read the code; runtime checks run it in a sandbox.
import { parser } from '@lezer/javascript'
import { protectLoops } from '../../core/loopGuard.js'
import { runInSandbox } from './sandbox.js'

export const BLANK_PAGE = '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n</head>\n<body>\n  <script src="script.js"></script>\n</body>\n</html>\n'

const RUNTIME_TYPES = new Set(['js-runs', 'js-value', 'js-log', 'js-dom'])
const COMMENTS = new Set(['LineComment', 'BlockComment'])
const compact = (text) => text.replace(/\s+/g, '')

// Flat list of syntax nodes, cached for the last few sources.
const nodeCache = new Map()
function syntaxNodes(code) {
  if (nodeCache.has(code)) return nodeCache.get(code)
  const nodes = []
  parser.parse(code).iterate({
    enter(ref) {
      if (!COMMENTS.has(ref.name)) nodes.push(ref.node)
    },
  })
  nodeCache.set(code, nodes)
  if (nodeCache.size > 16) nodeCache.delete(nodeCache.keys().next().value)
  return nodes
}

const childList = (node) => {
  const children = []
  for (let child = node.firstChild; child; child = child.nextSibling) children.push(child)
  return children
}

// Names bound by a declaration, including destructured ones, but not parameters of its value.
function declaredNames(node, code) {
  const names = []
  const collect = (pattern) => {
    for (const child of childList(pattern)) {
      if (child.name === 'VariableDefinition') names.push(code.slice(child.from, child.to))
      else if (child.name === 'Equals') break
      else if (/Pattern|PatternProperty/.test(child.name)) collect(child)
    }
  }
  for (const child of childList(node)) {
    if (child.name === 'VariableDefinition') names.push(code.slice(child.from, child.to))
    else if (child.name === 'ObjectPattern' || child.name === 'ArrayPattern') collect(child)
  }
  return names
}

function declares(code, name, kind) {
  return syntaxNodes(code).some((node) => {
    if (node.name === 'VariableDeclaration') {
      return (!kind || node.firstChild?.name === kind) && declaredNames(node, code).includes(name)
    }
    if (node.name === 'FunctionDeclaration' || node.name === 'ClassDeclaration') {
      const expected = node.name === 'FunctionDeclaration' ? 'function' : 'class'
      const id = childList(node).find((child) => child.name === 'VariableDefinition')
      return (!kind || kind === expected) && id && code.slice(id.from, id.to) === name
    }
    return false
  })
}

function calls(code, callee) {
  return syntaxNodes(code).some((node) => {
    if (node.name !== 'CallExpression' || !node.firstChild) return false
    const text = compact(code.slice(node.firstChild.from, node.firstChild.to))
    return text === callee || text.endsWith(`.${callee}`)
  })
}

function countNodes(code, name, pattern) {
  const regex = pattern ? new RegExp(pattern) : null
  return syntaxNodes(code).filter((node) => node.name === name && (!regex || regex.test(code.slice(node.from, node.to)))).length
}

export function testSyntax(descriptor, code) {
  let found
  if (descriptor.declares) found = declares(code, descriptor.declares, descriptor.kind)
  else if (descriptor.calls) found = calls(code, descriptor.calls)
  else found = countNodes(code, descriptor.node, descriptor.text) >= (descriptor.min ?? 1)
  return descriptor.absent ? !found : found
}

function hydrateCheck(check) {
  const { label, ...descriptor } = check
  if (RUNTIME_TYPES.has(descriptor.type)) return { label, descriptor, runtime: true }
  return { label, descriptor, test: (code) => testSyntax(descriptor, code) }
}

// Resolves to one boolean per check, in lesson order. The executor is swappable for tests.
export async function evaluateLesson(lesson, code, { execute = runInSandbox, loopMessage } = {}) {
  const runtimeChecks = lesson.checks.filter((check) => check.runtime)
  const report = runtimeChecks.length
    ? await execute({
      html: lesson.files?.['/index.html'] ?? BLANK_PAGE,
      code: protectLoops(code, loopMessage),
      checks: runtimeChecks.map((check) => check.descriptor),
      wait: lesson.wait ?? 0,
    })
    : null
  let index = 0
  return lesson.checks.map((check) => (check.runtime ? Boolean(report?.passed[index++]) : check.test(code)))
}

// Every lesson starts with a "runs without errors" check labelled from shared text.
export function hydrateLessons(_language, lessons, shared = {}) {
  return lessons.map((lesson) => {
    const hydrated = {
      ...lesson,
      checks: [{ label: shared.runsCheck, type: 'js-runs' }, ...lesson.checks].map(hydrateCheck),
    }
    hydrated.evaluate = (code, options) => evaluateLesson(hydrated, code, options)
    return hydrated
  })
}
