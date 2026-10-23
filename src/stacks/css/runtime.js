const stripCssComments = (code) => String(code).replace(/\/\*[\s\S]*?\*\//g, '')

const normalizeSelector = (selector) => String(selector)
  .trim()
  .replace(/\s*([>+~])\s*/g, '$1')
  .replace(/\s+/g, ' ')

const normalizeValue = (value) => String(value)
  .trim()
  .toLowerCase()
  .replace(/\s*([(),:/])\s*/g, '$1')
  .replace(/\s+/g, ' ')

const compactDescriptor = (descriptor) => Object.fromEntries(
  Object.entries(descriptor).filter(([, value]) => value !== undefined && value !== false),
)

const semicolonDescriptor = {
  type: 'css-semicolon-termination',
  label: 'Every CSS declaration ends with a semicolon',
}

function eachSimpleBlock(source, callback) {
  const pattern = /([^{}]+)\{([^{}]*)\}/g
  let match

  while ((match = pattern.exec(stripCssComments(source)))) {
    callback(match[2], match)
  }
}

function bodyHasUnterminatedDeclaration(body) {
  const trimmedBody = String(body).trim()
  if (!trimmedBody || !trimmedBody.includes(':')) return false

  return trimmedBody
    .split(';')
    .at(-1)
    .trim()
    .includes(':')
}

export function allCssDeclarationsEndWithSemicolons(code) {
  let valid = true

  eachSimpleBlock(code, (body) => {
    if (bodyHasUnterminatedDeclaration(body)) valid = false
  })

  return valid
}

function parseDeclarations(body) {
  const declarations = {}

  for (const declaration of String(body).split(';')) {
    const separatorIndex = declaration.indexOf(':')
    if (separatorIndex < 0) continue

    const property = declaration.slice(0, separatorIndex).trim().toLowerCase()
    const value = declaration.slice(separatorIndex + 1).trim()
    if (property && value) declarations[property] = value
  }

  return declarations
}

function removeAtRuleBlocks(source) {
  const cleaned = stripCssComments(source)
  const output = cleaned.split('')
  const pattern = /@\w[\w-]*\s*[^{}]*\{/g
  let match

  while ((match = pattern.exec(cleaned))) {
    let depth = 1
    let cursor = pattern.lastIndex

    while (cursor < cleaned.length && depth > 0) {
      if (cleaned[cursor] === '{') depth += 1
      if (cleaned[cursor] === '}') depth -= 1
      cursor += 1
    }

    if (depth === 0) {
      output.fill(' ', match.index, cursor)
      pattern.lastIndex = cursor
    }
  }

  return output.join('')
}

function parseCssRules(source) {
  const rules = []

  eachSimpleBlock(removeAtRuleBlocks(source), (body, match) => {
    const selectors = match[1].split(',').map(normalizeSelector).filter(Boolean)
    if (!selectors.length) return

    rules.push({
      selectors,
      declarations: parseDeclarations(body),
      index: match.index,
    })
  })

  return rules
}

function findAtRuleBlocks(source, name) {
  const blocks = []
  const cleaned = stripCssComments(source)
  const pattern = new RegExp(`@${name}\\s*([^{}]*)\\{`, 'gi')
  let match

  while ((match = pattern.exec(cleaned))) {
    let depth = 1
    let cursor = pattern.lastIndex

    while (cursor < cleaned.length && depth > 0) {
      if (cleaned[cursor] === '{') depth += 1
      if (cleaned[cursor] === '}') depth -= 1
      cursor += 1
    }

    if (depth === 0) {
      blocks.push({
        query: match[1].trim(),
        content: cleaned.slice(pattern.lastIndex, cursor - 1),
      })
    }

    pattern.lastIndex = cursor
  }

  return blocks
}

function selectorsMatch(actualSelectors, descriptor) {
  const expectedSelectors = descriptor.selectors ?? [descriptor.selector]
  return expectedSelectors.every((selector) => actualSelectors.includes(normalizeSelector(selector)))
}

function numericValues(value) {
  return [...String(value).matchAll(/-?\d*\.?\d+/g)].map((match) => Number(match[0]))
}

function cssValueMatches(actual, condition) {
  if (condition === true) return actual !== undefined
  if (actual === undefined) return false

  const normalizedActual = normalizeValue(actual)
  const config = typeof condition === 'object' && condition !== null ? condition : { value: condition }

  if (config.value === true) return true
  if (config.value !== undefined && normalizedActual !== normalizeValue(config.value)) return false
  if (config.notValue !== undefined && normalizedActual === normalizeValue(config.notValue)) return false
  if (config.contains && !normalizedActual.includes(normalizeValue(config.contains))) return false
  if (config.oneOf && !config.oneOf.map(normalizeValue).includes(normalizedActual)) return false
  if (config.pattern && !(new RegExp(config.pattern, config.patternFlags ?? 'i').test(normalizedActual))) return false
  if (config.minNumber !== undefined && !numericValues(normalizedActual).some((number) => number >= config.minNumber)) return false
  if (config.unit && !(new RegExp(`-?\\d*\\.?\\d+${config.unit}\\b`, 'i').test(normalizedActual))) return false

  return true
}

function declarationsMatch(actualDeclarations, expectedDeclarations = {}) {
  return Object.entries(expectedDeclarations).every(([property, condition]) => (
    cssValueMatches(actualDeclarations[property.toLowerCase()], condition)
  ))
}

const dynamicPseudoPattern = /:(?:hover|focus|focus-visible|focus-within|active|visited|link|target)\b/i
const pseudoElementPattern = /::(?:before|after)$/i
const computedPropertyGroups = {
  border: ['border-top-width', 'border-top-style', 'border-top-color'],
  'border-radius': ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'],
  margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
}

function cssDeclarationIsBrowserValid(property, value) {
  if (property.startsWith('--')) return String(value).trim().length > 0

  if (typeof globalThis.CSS?.supports === 'function') {
    return globalThis.CSS.supports(property, value)
  }

  if (typeof document !== 'undefined') {
    const probe = document.createElement('div')
    probe.style.setProperty(property, value)
    return probe.style.getPropertyValue(property) !== ''
  }

  return true
}

function declarationsAreBrowserValid(actualDeclarations, expectedDeclarations = {}) {
  return Object.keys(expectedDeclarations).every((property) => {
    const normalizedProperty = property.toLowerCase()
    const value = actualDeclarations[normalizedProperty]
    return value === undefined || cssDeclarationIsBrowserValid(normalizedProperty, value)
  })
}

function extractPreviewBody(html) {
  const source = String(html ?? '')

  if (typeof globalThis.DOMParser === 'function') {
    return new globalThis.DOMParser().parseFromString(source, 'text/html').body.innerHTML
  }

  return source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? source
}

function createPreviewHost(files, css) {
  if (typeof document === 'undefined' || !document.body || !files?.['/index.html']) return null

  const style = document.createElement('style')
  const host = document.createElement('div')
  const content = document.createElement('div')
  const root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host

  style.textContent = `${files['/base.css'] ?? ''}\n${css}`
  host.style.cssText = [
    'position:absolute',
    'left:-10000px',
    'top:0',
    'width:1024px',
    'min-height:1px',
    'visibility:hidden',
    'pointer-events:none',
  ].join(';')
  host.setAttribute('data-codetrail-validation-host', '')
  content.innerHTML = extractPreviewBody(files['/index.html'])

  root.append(style, content)
  document.body.append(host)

  return {
    host: content,
    cleanup: () => {
      host.remove()
    },
  }
}

function selectorTarget(selector) {
  const pseudoElement = selector.match(pseudoElementPattern)?.[0] ?? null
  return {
    selector: pseudoElement ? selector.slice(0, -pseudoElement.length) : selector,
    pseudoElement,
  }
}

function canComputeSelector(selector) {
  return selector && !selector.includes(':root') && !dynamicPseudoPattern.test(selector)
}

function computedPropertiesFor(property) {
  if (property.startsWith('--')) return []
  return computedPropertyGroups[property] ?? [property]
}

function readComputedValues(host, selector, property) {
  if (!canComputeSelector(selector)) return null

  const target = selectorTarget(selector)
  let element

  try {
    element = host.querySelector(target.selector)
  } catch {
    return null
  }

  if (!element) return false

  const style = getComputedStyle(element, target.pseudoElement)
  const values = computedPropertiesFor(property)
    .map((computedProperty) => normalizeValue(style.getPropertyValue(computedProperty)))
    .filter(Boolean)

  return values.length ? values : null
}

function computedValuesChanged(files, code, selector, property) {
  const beforePreview = createPreviewHost(files, '')
  if (!beforePreview) return true

  const afterPreview = createPreviewHost(files, code)

  try {
    if (!afterPreview) return true

    const beforeValues = readComputedValues(beforePreview.host, selector, property)
    const afterValues = readComputedValues(afterPreview.host, selector, property)

    if (beforeValues === null || afterValues === null) return true
    if (beforeValues === false || afterValues === false) return false

    return afterValues.some((value, index) => value !== beforeValues[index])
  } finally {
    afterPreview?.cleanup()
    beforePreview.cleanup()
  }
}

function declarationsAffectPreview(descriptor, code, context) {
  const files = context?.files
  if (!files) return true

  const expectedSelectors = descriptor.selectors ?? [descriptor.selector]
  const expectedDeclarations = Object.keys(descriptor.declarations ?? {})

  return expectedSelectors.every((selector) => (
    expectedDeclarations.every((property) => (
      computedValuesChanged(files, code, normalizeSelector(selector), property.toLowerCase())
    ))
  ))
}

function ruleMatchesDescriptor(rule, descriptor) {
  return selectorsMatch(rule.selectors, descriptor)
    && declarationsMatch(rule.declarations, descriptor.declarations)
    && declarationsAreBrowserValid(rule.declarations, descriptor.declarations)
}

function testCssRuleDescriptor(descriptor, code, context) {
  const matchingRuleExists = parseCssRules(code).some((rule) => ruleMatchesDescriptor(rule, descriptor))
  return matchingRuleExists && declarationsAffectPreview(descriptor, code, context)
}

function testCssMediaRuleDescriptor(descriptor, code) {
  return findAtRuleBlocks(code, 'media')
    .filter((block) => normalizeValue(block.query).includes(normalizeValue(descriptor.queryContains)))
    .some((block) => parseCssRules(block.content).some((rule) => (
      selectorsMatch(rule.selectors, descriptor)
        && declarationsMatch(rule.declarations, descriptor.declarations)
        && declarationsAreBrowserValid(rule.declarations, descriptor.declarations)
    )))
}

function testCssAtRuleDescriptor(descriptor, code) {
  return findAtRuleBlocks(code, descriptor.name)
    .some((block) => (
      (!descriptor.queryContains || normalizeValue(block.query).includes(normalizeValue(descriptor.queryContains)))
        && (!descriptor.contains || normalizeValue(block.content).includes(normalizeValue(descriptor.contains)))
    ))
}

export function testDescriptor(descriptor, code, context) {
  if (descriptor.type === 'css-semicolon-termination') return allCssDeclarationsEndWithSemicolons(code)
  if (descriptor.type === 'css-rule') return testCssRuleDescriptor(descriptor, code, context)
  if (descriptor.type === 'css-media-rule') return testCssMediaRuleDescriptor(descriptor, code)
  if (descriptor.type === 'css-at-rule') return testCssAtRuleDescriptor(descriptor, code)
  return false
}

export function createCheckFromDescriptor(descriptor, context) {
  const normalizedDescriptor = compactDescriptor(descriptor)
  return {
    label: normalizedDescriptor.label,
    descriptor: normalizedDescriptor,
    test: (code) => testDescriptor(normalizedDescriptor, code, context),
  }
}

export const createBestPractice = (lesson) => (
  `Use the ${lesson.eyebrow.toLowerCase()} rule deliberately, keep the selector tied to the preview markup, and make one visible change before tuning values.`
)

const createSemicolonCheck = () => createCheckFromDescriptor(semicolonDescriptor)

export function hydrateLessons(_language, lessons) {
  return lessons.map((lesson) => ({
    ...lesson,
    bestPractice: lesson.bestPractice ?? createBestPractice(lesson),
    checks: [
      createSemicolonCheck(),
      ...lesson.checks.map((check) => (
        typeof check.test === 'function' ? check : createCheckFromDescriptor(check, lesson)
      )),
    ],
  }))
}
