// HTML check engine. Lessons ship serializable descriptors that are turned into test functions here.

const commentPatterns = {
  html: /<!--[\s\S]*?-->/g,
}

export const stripComments = (language, code) => String(code).replace(commentPatterns[language] ?? /$^/g, '')

const normalizeComparable = (language, value, preserveComments = false) => (
  preserveComments ? String(value) : stripComments(language, value)
)
  .replace(/\s+/g, '')
  .replace(/["']/g, '"')
  .toLowerCase()

const serializePattern = (pattern) => {
  if (typeof pattern === 'string') return { pattern, flags: '' }
  return { pattern: pattern.source, flags: pattern.flags }
}

const compactDescriptor = (descriptor) => Object.fromEntries(
  Object.entries(descriptor).filter(([, value]) => value !== undefined && value !== false),
)

export function regexDescriptor(label, patternOrPatterns, preserveComments = false) {
  const patterns = Array.isArray(patternOrPatterns) ? patternOrPatterns.map(serializePattern) : null
  return compactDescriptor({
    label,
    type: 'regex',
    ...(patterns ? { patterns } : serializePattern(patternOrPatterns)),
    preserveComments,
  })
}

export function tokenDescriptor(label, tokenOrTokens, preserveComments = false) {
  const tokens = Array.isArray(tokenOrTokens) ? tokenOrTokens : null
  return compactDescriptor({
    label,
    type: 'token',
    ...(tokens ? { tokens } : { token: tokenOrTokens }),
    preserveComments,
  })
}

export function rawTokenDescriptor(label, tokenOrTokens) {
  const tokens = Array.isArray(tokenOrTokens) ? tokenOrTokens : null
  return compactDescriptor({
    label,
    type: 'raw-token',
    ...(tokens ? { tokens } : { token: tokenOrTokens }),
  })
}

export function forbiddenRegexDescriptor(label, patternOrPatterns, preserveComments = false) {
  const patterns = Array.isArray(patternOrPatterns) ? patternOrPatterns.map(serializePattern) : null
  return compactDescriptor({
    label,
    type: 'not-regex',
    ...(patterns ? { patterns } : serializePattern(patternOrPatterns)),
    preserveComments,
  })
}

const getRegexEntries = (descriptor) => descriptor.patterns ?? [{ pattern: descriptor.pattern, flags: descriptor.flags ?? '' }]
const getTokens = (descriptor) => descriptor.tokens ?? [descriptor.token]

const htmlVoidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])

const decodeHtmlText = (value) => String(value)
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&nbsp;/gi, ' ')

const normalizeHtmlText = (value) => decodeHtmlText(value)
  .replace(/<[^>]*>/g, ' ')
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}#]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeHtmlAttribute = (value) => decodeHtmlText(value)
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase()

const getHtmlTags = (tag) => Array.isArray(tag) ? tag : [tag]

function parseHtmlAttributes(attributesSource) {
  const attributes = {}
  const attrPattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match

  while ((match = attrPattern.exec(attributesSource))) {
    const [, rawName, doubleQuoted, singleQuoted, unquoted] = match
    attributes[rawName.toLowerCase()] = doubleQuoted ?? singleQuoted ?? unquoted ?? true
  }

  return attributes
}

const maskHtmlComments = (source) => String(source).replace(commentPatterns.html, (comment) => ' '.repeat(comment.length))

function findHtmlOpenTagsWithRegex(source, tag) {
  const pattern = new RegExp(`<${tag}\\b([^>]*)>`, 'gi')
  const matches = []
  let match

  while ((match = pattern.exec(source))) {
    matches.push({
      attrs: parseHtmlAttributes(match[1]),
      content: '',
      index: match.index,
    })
  }

  return matches
}

function findHtmlElementsWithRegex(source, tag) {
  if (htmlVoidTags.has(tag.toLowerCase())) return findHtmlOpenTagsWithRegex(source, tag)

  const pattern = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  const matches = []
  let match

  while ((match = pattern.exec(source))) {
    matches.push({
      attrs: parseHtmlAttributes(match[1]),
      content: match[2],
      index: match.index,
    })
  }

  return matches
}

// Source offsets of every explicit open tag, grouped by tag name.
function sourceTagPositions(source) {
  const positions = new Map()
  const indexSource = maskHtmlComments(source)
  const pattern = /<([a-z][\w:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi
  let match

  while ((match = pattern.exec(indexSource))) {
    const tag = match[1].toLowerCase()
    if (!positions.has(tag)) positions.set(tag, [])
    positions.get(tag).push(match.index)
  }

  return positions
}

function isHtmlNestingBalanced(source) {
  const stack = []
  const indexSource = maskHtmlComments(source)
  const pattern = /<\/?([a-z][\w:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi
  let match

  while ((match = pattern.exec(indexSource))) {
    const token = match[0]
    const tag = match[1].toLowerCase()

    if (token.startsWith('</')) {
      if (stack.at(-1) !== tag) return false
      stack.pop()
      continue
    }

    if (htmlVoidTags.has(tag) || token.endsWith('/>')) continue
    stack.push(tag)
  }

  return stack.length === 0
}

function canUseDomParser(source) {
  return typeof globalThis.DOMParser === 'function' && isHtmlNestingBalanced(source)
}

function readDomAttributes(node) {
  return Object.fromEntries(
    Array.from(node.attributes ?? []).map((attribute) => [
      attribute.name.toLowerCase(),
      attribute.value,
    ]),
  )
}

function domNodeContent(node) {
  if (node.tagName?.toLowerCase() === 'template' && node.content) {
    return Array.from(node.content.childNodes)
      .map((child) => child.outerHTML ?? child.textContent ?? '')
      .join('')
  }

  return node.innerHTML ?? ''
}

function domElementsForTag(documentNode, tag, sourceIndexes) {
  const normalizedTag = tag.toLowerCase()
  const implicitDocumentTags = new Set(['html', 'head', 'body'])

  if (implicitDocumentTags.has(normalizedTag) && !sourceIndexes.has(normalizedTag)) {
    return []
  }

  if (normalizedTag === 'html') return [documentNode.documentElement].filter(Boolean)
  if (normalizedTag === 'head') return [documentNode.head].filter(Boolean)
  if (normalizedTag === 'body') return [documentNode.body].filter(Boolean)
  return Array.from(documentNode.getElementsByTagName(normalizedTag))
}

// Checks query the same code many times per pass, so parsed documents are cached.
const parseCache = new Map()
const PARSE_CACHE_SIZE = 32

function parseHtmlSource(source) {
  if (parseCache.has(source)) return parseCache.get(source)

  const parsed = canUseDomParser(source)
    ? {
        documentNode: new globalThis.DOMParser().parseFromString(source, 'text/html'),
        positions: sourceTagPositions(source),
      }
    : null

  if (parseCache.size >= PARSE_CACHE_SIZE) parseCache.delete(parseCache.keys().next().value)
  parseCache.set(source, parsed)
  return parsed
}

function findHtmlElementsWithDomParser(source, tag) {
  const parsed = parseHtmlSource(String(source))
  if (!parsed) return null

  const positions = parsed.positions.get(tag.toLowerCase()) ?? []
  return domElementsForTag(parsed.documentNode, tag, parsed.positions)
    .map((node, index) => ({
      attrs: readDomAttributes(node),
      content: domNodeContent(node),
      index: positions[index] ?? index,
    }))
}

// DOM parsing is the most accurate; regex covers unbalanced markup and Node tests.
function findHtmlElements(source, tag) {
  const domMatches = findHtmlElementsWithDomParser(source, tag)
  return domMatches?.length ? domMatches : findHtmlElementsWithRegex(source, tag)
}

function htmlAttributeMatches(actual, condition) {
  const config = typeof condition === 'object' && condition !== null ? condition : { value: condition }
  if (condition === true) return actual !== undefined
  if (config.absent) return actual === undefined
  if (actual === undefined) return config.optional === true

  const normalizedActual = normalizeHtmlAttribute(actual === true ? '' : actual)

  if (config.value === true) return actual !== undefined
  if (config.notValue !== undefined) {
    const forbiddenValues = Array.isArray(config.notValue) ? config.notValue : [config.notValue]
    if (forbiddenValues.some((value) => normalizedActual === normalizeHtmlAttribute(value))) return false
  }
  if (config.minLength && normalizedActual.length < config.minLength) return false
  if (config.pattern && !(new RegExp(config.pattern, config.patternFlags ?? '').test(normalizedActual))) return false
  if (config.minTokens && normalizedActual.split(/\s+/).filter(Boolean).length < config.minTokens) return false
  if (config.tokens) {
    const actualTokens = normalizedActual.split(/\s+/)
    return config.tokens.every((token) => actualTokens.includes(normalizeHtmlAttribute(token)))
  }
  if (config.value === undefined) return true

  const expected = normalizeHtmlAttribute(config.value ?? '')
  if (config.mode === 'contains') return normalizedActual.includes(expected)
  if (config.mode === 'url') return normalizedActual.replace(/\/$/, '') === expected.replace(/\/$/, '')
  return normalizedActual === expected
}

function htmlAttributesMatch(actualAttributes, expectedAttributes = {}) {
  return Object.entries(expectedAttributes).every(([name, condition]) => (
    htmlAttributeMatches(actualAttributes[name.toLowerCase()], condition)
  ))
}

function htmlTextMatches(content, descriptor) {
  const actual = normalizeHtmlText(content)
  if (!actual && (descriptor.text || descriptor.words)) return false

  if (descriptor.minTextLength && actual.length < 1) return false
  if (descriptor.minWords && actual.split(/\s+/).filter(Boolean).length < descriptor.minWords) return false

  if (descriptor.words) {
    return descriptor.words.every((word) => actual.includes(normalizeHtmlText(word)))
  }

  if (descriptor.text) {
    const expected = normalizeHtmlText(descriptor.text)
    return descriptor.exactText ? actual === expected : actual.includes(expected)
  }

  return true
}

function htmlChildrenMatch(content, descriptor) {
  return (descriptor.children ?? []).every((childDescriptor) => testDescriptor('html', childDescriptor, content))
}

function htmlElementMatches(element, descriptor) {
  return htmlAttributesMatch(element.attrs, descriptor.attrs)
    && htmlTextMatches(element.content, descriptor)
    && htmlChildrenMatch(element.content, descriptor)
}

function testHtmlElementDescriptor(descriptor, code) {
  const source = descriptor.preserveComments ? String(code) : stripComments('html', code)
  const min = descriptor.min ?? 1
  const matches = getHtmlTags(descriptor.tag)
    .flatMap((tag) => findHtmlElements(source, tag))
    .filter((element) => htmlElementMatches(element, descriptor))

  return matches.length >= min
}

function testHtmlSequenceDescriptor(descriptor, code) {
  const source = descriptor.preserveComments ? String(code) : stripComments('html', code)
  const elements = getHtmlTags(descriptor.tag)
    .flatMap((tag) => findHtmlElements(source, tag))
    .sort((first, second) => first.index - second.index)
  let cursor = 0

  for (const element of elements) {
    if (htmlTextMatches(element.content, { text: descriptor.texts[cursor] })) cursor += 1
    if (cursor >= descriptor.texts.length) return true
  }

  return false
}

function testHtmlOrderDescriptor(descriptor, code) {
  const source = descriptor.preserveComments ? String(code) : stripComments('html', code)
  let cursor = 0

  for (const tag of descriptor.tags) {
    const pattern = new RegExp(`<${tag}\\b`, 'i')
    const nextIndex = source.slice(cursor).search(pattern)
    if (nextIndex < 0) return false
    cursor += nextIndex + 1
  }

  return true
}

function testHtmlLabelControlDescriptor(descriptor, code) {
  const source = descriptor.preserveComments ? String(code) : stripComments('html', code)
  const labels = findHtmlElements(source, 'label')
    .filter((label) => htmlAttributesMatch(label.attrs, descriptor.labelAttrs))
    .filter((label) => htmlTextMatches(label.content, { minTextLength: descriptor.minTextLength ?? 1 }))
  const controlTags = getHtmlTags(descriptor.tag)

  return labels.some((label) => {
    if (label.attrs.for) {
      const targetId = normalizeHtmlAttribute(label.attrs.for)
      return controlTags
        .flatMap((tag) => findHtmlElements(source, tag))
        .some((control) => (
          normalizeHtmlAttribute(control.attrs.id ?? '') === targetId
            && htmlAttributesMatch(control.attrs, descriptor.attrs)
        ))
    }

    return controlTags
      .flatMap((tag) => findHtmlElements(label.content, tag))
      .some((control) => htmlAttributesMatch(control.attrs, descriptor.attrs))
  })
}

function testHtmlReferenceDescriptor(descriptor, code) {
  const source = descriptor.preserveComments ? String(code) : stripComments('html', code)
  const sourceAttr = descriptor.sourceAttr.toLowerCase()
  const targetAttr = (descriptor.targetAttr ?? 'id').toLowerCase()
  const sourcePrefix = descriptor.sourcePrefix ?? ''
  const sources = getHtmlTags(descriptor.sourceTag)
    .flatMap((tag) => findHtmlElements(source, tag))
    .filter((element) => htmlAttributesMatch(element.attrs, descriptor.sourceAttrs))
    .filter((element) => htmlTextMatches(element.content, { minTextLength: descriptor.minTextLength ?? 0 }))
  const targets = getHtmlTags(descriptor.targetTag)
    .flatMap((tag) => findHtmlElements(source, tag))
    .filter((element) => htmlAttributesMatch(element.attrs, descriptor.targetAttrs))

  return sources.some((sourceElement) => {
    const rawReference = sourceElement.attrs[sourceAttr]
    if (typeof rawReference !== 'string') return false

    const reference = normalizeHtmlAttribute(rawReference)
    if (sourcePrefix && !reference.startsWith(sourcePrefix)) return false

    const targetValue = sourcePrefix ? reference.slice(sourcePrefix.length) : reference
    if (!targetValue) return false

    return targets.some((targetElement) => (
      (!descriptor.ordered || sourceElement.index < targetElement.index)
        && normalizeHtmlAttribute(targetElement.attrs[targetAttr] ?? '') === targetValue
    ))
  })
}

function countLabelledRadios(containerContent, radios) {
  const labels = findHtmlElements(containerContent, 'label')
    .filter((label) => htmlTextMatches(label.content, { minTextLength: 1 }))
  let labelledCount = 0

  for (const label of labels) {
    if (label.attrs.for) {
      const targetId = normalizeHtmlAttribute(label.attrs.for)
      if (radios.some((radio) => normalizeHtmlAttribute(radio.attrs.id ?? '') === targetId)) {
        labelledCount += 1
        continue
      }
    }

    const hasNestedRadio = findHtmlElements(label.content, 'input').some((input) => (
      htmlAttributesMatch(input.attrs, { type: 'radio', name: nonEmptyAttributeCondition })
        && radios.some((radio) => (
          normalizeHtmlAttribute(radio.attrs.name ?? '') === normalizeHtmlAttribute(input.attrs.name ?? '')
            && (
              !input.attrs.value
                || normalizeHtmlAttribute(radio.attrs.value ?? '') === normalizeHtmlAttribute(input.attrs.value)
            )
        ))
    ))

    if (hasNestedRadio) {
      labelledCount += 1
    }
  }

  return labelledCount
}

const nonEmptyAttributeCondition = { minLength: 1 }

function testHtmlRadioGroupDescriptor(descriptor, code) {
  const source = descriptor.preserveComments ? String(code) : stripComments('html', code)
  const min = descriptor.min ?? 2
  const containers = getHtmlTags(descriptor.containerTag ?? 'fieldset')
    .flatMap((tag) => findHtmlElements(source, tag))

  return containers.some((container) => {
    if (descriptor.requireLegend !== false && !testDescriptor('html', {
      type: 'html-element',
      tag: 'legend',
      minTextLength: 1,
    }, container.content)) return false

    const radios = findHtmlElements(container.content, 'input')
      .filter((input) => htmlAttributesMatch(input.attrs, {
        type: 'radio',
        name: nonEmptyAttributeCondition,
      }))
    const groups = new Map()
    for (const radio of radios) {
      const name = normalizeHtmlAttribute(radio.attrs.name)
      if (!groups.has(name)) groups.set(name, [])
      groups.get(name).push(radio)
    }

    return [...groups.values()].some((group) => {
      if (group.length < min) return false
      if (descriptor.requireLabels === false) return true
      return countLabelledRadios(container.content, group) >= min
    })
  })
}

export function testDescriptor(language, descriptor, code) {
  if (descriptor.type === 'html-element') return testHtmlElementDescriptor(descriptor, code)
  if (descriptor.type === 'html-sequence') return testHtmlSequenceDescriptor(descriptor, code)
  if (descriptor.type === 'html-order') return testHtmlOrderDescriptor(descriptor, code)
  if (descriptor.type === 'html-label-control') return testHtmlLabelControlDescriptor(descriptor, code)
  if (descriptor.type === 'html-reference') return testHtmlReferenceDescriptor(descriptor, code)
  if (descriptor.type === 'html-radio-group') return testHtmlRadioGroupDescriptor(descriptor, code)

  if (descriptor.type === 'regex') {
    const source = descriptor.preserveComments ? String(code) : stripComments(language, code)
    return getRegexEntries(descriptor).some(({ pattern, flags = '' }) => {
      const regex = new RegExp(pattern, flags)
      regex.lastIndex = 0
      return regex.test(source)
    })
  }

  if (descriptor.type === 'not-regex') {
    const source = descriptor.preserveComments ? String(code) : stripComments(language, code)
    return getRegexEntries(descriptor).every(({ pattern, flags = '' }) => {
      const regex = new RegExp(pattern, flags)
      regex.lastIndex = 0
      return !regex.test(source)
    })
  }

  if (descriptor.type === 'regex-count') {
    const source = descriptor.preserveComments ? String(code) : stripComments(language, code)
    return getRegexEntries(descriptor).some(({ pattern, flags = '' }) => {
      const countFlags = flags.includes('g') ? flags : `${flags}g`
      const regex = new RegExp(pattern, countFlags)
      return (source.match(regex) ?? []).length >= (descriptor.min ?? 1)
    })
  }

  if (descriptor.type === 'raw-token') {
    const source = String(code).replace(/\s+/g, '').toLowerCase()
    return getTokens(descriptor).some((token) => source.includes(String(token).replace(/\s+/g, '').toLowerCase()))
  }

  if (descriptor.type === 'token') {
    const source = normalizeComparable(language, code, descriptor.preserveComments)
    return getTokens(descriptor).some((token) => source.includes(normalizeComparable(language, token, descriptor.preserveComments)))
  }

  return false
}

export function createCheckFromDescriptor(language, descriptor) {
  const normalizedDescriptor = compactDescriptor(descriptor)
  return {
    label: normalizedDescriptor.label,
    descriptor: normalizedDescriptor,
    test: (code) => testDescriptor(language, normalizedDescriptor, code),
  }
}

export function createRegexCheck(language, label, patternOrPatterns, preserveComments = false) {
  return createCheckFromDescriptor(language, regexDescriptor(label, patternOrPatterns, preserveComments))
}

export function createTokenCheck(language, label, tokenOrTokens, preserveComments = false) {
  return createCheckFromDescriptor(language, tokenDescriptor(label, tokenOrTokens, preserveComments))
}

export function createRawTokenCheck(language, label, tokenOrTokens) {
  return createCheckFromDescriptor(language, rawTokenDescriptor(label, tokenOrTokens))
}

export function createForbiddenRegexCheck(language, label, patternOrPatterns, preserveComments = false) {
  return createCheckFromDescriptor(language, forbiddenRegexDescriptor(label, patternOrPatterns, preserveComments))
}

export function createRegexTest(language, patternOrPatterns, preserveComments = false) {
  const descriptor = regexDescriptor('', patternOrPatterns, preserveComments)
  const test = (code) => testDescriptor(language, descriptor, code)
  test.descriptor = descriptor
  return test
}

// Turns serialized descriptors (already labelled in the active language) into runnable checks.
export function hydrateLessons(language, lessons) {
  return lessons.map((lesson) => ({
    ...lesson,
    checks: lesson.checks.map((check) => (
      typeof check.test === 'function' ? check : createCheckFromDescriptor(language, check)
    )),
  }))
}
