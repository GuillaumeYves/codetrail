import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createTranslator, format, lookup, pickLocale } from '../src/i18n/format.js'
import { localizeLessons, mergeLessonText } from '../src/core/lessonText.js'
import { codeSpans } from '../src/core/codeSpans.js'
import { loadStack, stackIds, stacks } from '../src/stacks/registry.js'

const root = new URL('../', import.meta.url)
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const jsonFiles = async (dir) => (await readdir(new URL(dir, root))).filter((file) => file.endsWith('.json')).sort()

// Dotted key to string value, arrays included by index (faq.items.0.question).
function flatten(node, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') flatten(value, path, out)
    else out[path] = value
  }
  return out
}

const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

const en = await readJson('src/i18n/locales/en.json')
const enKeys = flatten(en)

test('format fills params and keeps unknown placeholders visible', () => {
  assert.equal(format('{done} of {total}', { done: 2, total: 5 }), '2 of 5')
  assert.equal(format('Hi {name}', {}), 'Hi {name}')
  assert.equal(format('{n}', { n: 0 }), '0')
})

test('translator falls back to English, then to the key', () => {
  const t = createTranslator({ a: { b: 'Bonjour {name}' } }, { a: { b: 'Hello {name}', c: 'Only English' } })
  assert.equal(t('a.b', { name: 'Ada' }), 'Bonjour Ada')
  assert.equal(t('a.c'), 'Only English')
  assert.equal(t('a.missing'), 'a.missing')
  assert.deepEqual(t.raw('a'), { b: 'Bonjour {name}' })
  assert.equal(lookup({ x: [{ y: 'z' }] }, 'x.0.y'), 'z')
})

test('pickLocale matches exact tags, then base languages, then English', () => {
  assert.equal(pickLocale(['fr-CA', 'en'], ['en', 'fr']), 'fr')
  assert.equal(pickLocale(['pt-BR'], ['en', 'pt-BR', 'pt']), 'pt-BR')
  assert.equal(pickLocale(['de', undefined, ''], ['en', 'fr']), 'en')
  assert.equal(pickLocale([], ['en']), 'en')
})

test('every interface key used in the source exists in English', async () => {
  const sources = (await readdir(new URL('src/', root), { recursive: true })).filter((file) => file.endsWith('.jsx'))
  const roots = new Set(Object.keys(en))
  const missing = []
  for (const file of sources) {
    const code = await readFile(new URL(`src/${file}`, root), 'utf8')
    for (const [, key] of code.matchAll(/'([a-z]+\.[\w.]+)'/g)) {
      if (roots.has(key.split('.')[0]) && lookup(en, key) === undefined) missing.push(`${file}: ${key}`)
    }
  }
  assert.deepEqual(missing, [])
})

test('dynamic interface keys exist for every stack, stage, and reset type', async () => {
  const dynamic = ['all', 'redo'].flatMap((type) => ['label', 'title', 'text', 'action'].map((part) => `confirm.${type}.${part}`))
  for (const id of stackIds) {
    dynamic.push(`stacks.${id}.description`, `activities.${stacks[id].activity}`)
    const data = await readJson(`src/stacks/${id}/data.json`)
    for (const group of new Set(data.lessons.map((lesson) => lesson.group))) dynamic.push(`stages.${group}`)
  }
  assert.deepEqual(dynamic.filter((key) => typeof lookup(en, key) !== 'string'), [])
})

test('interface translations only use English keys with the same placeholders', async () => {
  for (const file of await jsonFiles('src/i18n/locales/')) {
    if (file === 'en.json') continue
    for (const [key, value] of Object.entries(flatten(await readJson(`src/i18n/locales/${file}`)))) {
      assert.ok(key in enKeys, `${file}: unknown key ${key}`)
      assert.deepEqual(placeholders(value), placeholders(enKeys[key]), `${file}: placeholders differ for ${key}`)
    }
  }
})

// English fallback is a safety net; a shipped language must still cover every string.
test('shipped interface translations cover every English key', async () => {
  for (const file of await jsonFiles('src/i18n/locales/')) {
    const keys = Object.keys(flatten(await readJson(`src/i18n/locales/${file}`)))
    assert.deepEqual(Object.keys(enKeys).filter((key) => !keys.includes(key)), [], `${file} is missing keys`)
  }
})

const LESSON_FIELDS =['title', 'topic', 'summary', 'objective', 'hints', 'commonMistake', 'bestPractice', 'checks']

for (const id of stackIds) {
  test(`${id}: data.json holds structure only and English covers every lesson`, async () => {
    const data = await readJson(`src/stacks/${id}/data.json`)
    const english = await readJson(`src/stacks/${id}/locales/en.json`)
    assert.deepEqual(data.locales, (await jsonFiles(`src/stacks/${id}/locales/`)).map((file) => file.slice(0, -5)))

    for (const lesson of data.lessons) {
      assert.deepEqual(LESSON_FIELDS.slice(0, -1).filter((field) => field in lesson), [], lesson.id)
      assert.equal(lesson.checks.every((check) => !('label' in check)), true, lesson.id)
      const text = english.lessons[lesson.id]
      for (const field of ['title', 'topic', 'summary', 'objective']) {
        assert.ok(text?.[field]?.length > 0, `${lesson.id} needs ${field}`)
      }
      // Hints go from a nudge to a near answer.
      assert.equal(text.hints?.length, 3, `${lesson.id} needs three hints`)
      assert.equal(text.hints.every((hint) => hint.trim().length > 0), true, lesson.id)
      const stray = text.hints.flatMap(codeSpans).filter((part) => !part.code && part.text.includes('`'))
      assert.deepEqual(stray, [], `${lesson.id} has an unbalanced code span`)
      assert.equal(text.checks.length, lesson.checks.length, `${lesson.id} check labels`)
      assert.equal(text.checks.every((label) => label.length > 0), true, lesson.id)
    }
    assert.deepEqual(Object.keys(english.lessons), data.lessons.map((lesson) => lesson.id))
  })

  test(`${id}: course translations match the English structure and cover every lesson`, async () => {
    const english = await readJson(`src/stacks/${id}/locales/en.json`)
    for (const file of await jsonFiles(`src/stacks/${id}/locales/`)) {
      if (file === 'en.json') continue
      const translation = await readJson(`src/stacks/${id}/locales/${file}`)
      for (const [key, value] of Object.entries(translation.shared ?? {})) {
        assert.ok(key in english.shared, `${file}: unknown shared key ${key}`)
        assert.deepEqual(placeholders(value), placeholders(english.shared[key]), `${file}: placeholders differ for ${key}`)
      }
      for (const [lessonId, text] of Object.entries(translation.lessons ?? {})) {
        assert.ok(lessonId in english.lessons, `${file}: unknown lesson ${lessonId}`)
        assert.deepEqual(Object.keys(text).filter((field) => !LESSON_FIELDS.includes(field)), [], `${file}: ${lessonId}`)
        assert.ok((text.checks?.length ?? 0) <= english.lessons[lessonId].checks.length, `${file}: ${lessonId} has extra checks`)
        assert.ok((text.hints?.length ?? 0) <= english.lessons[lessonId].hints.length, `${file}: ${lessonId} has extra hints`)
        // Sample text inside code may be translated, but every hint keeps its code spans, balanced.
        const spans = (hints) => (hints ?? []).map((hint) => codeSpans(hint).filter((part) => part.code).length)
        assert.deepEqual(spans(text.hints), spans(english.lessons[lessonId].hints).slice(0, text.hints?.length ?? 0), `${file}: ${lessonId} hint code`)
        const stray = (text.hints ?? []).flatMap(codeSpans).filter((part) => !part.code && part.text.includes('`'))
        assert.deepEqual(stray, [], `${file}: ${lessonId} has an unbalanced code span`)
      }

      // Completeness: every lesson, shared string, hint, and check label is translated.
      assert.deepEqual(Object.keys(english.shared).filter((key) => !translation.shared?.[key]), [], `${file}: shared text`)
      for (const [lessonId, source] of Object.entries(english.lessons)) {
        const text = translation.lessons?.[lessonId] ?? {}
        const missing = Object.keys(source).filter((field) => {
          if (Array.isArray(source[field])) return text[field]?.length !== source[field].length || text[field].some((item) => !item)
          return !text[field]
        })
        assert.deepEqual(missing, [], `${file}: ${lessonId} is missing fields`)
      }
    }
  })
}

const english = {
  shared: { commonMistake: 'Shared mistake', bestPractice: 'Use the smallest {topic} rule.' },
  lessons: {
    one: { title: 'One', topic: 'Box model', checks: ['First', 'Second'] },
    two: { title: 'Two', topic: 'Responsive CSS', bestPractice: 'Own advice', checks: [] },
  },
}

test('partial translations overlay English field by field', () => {
  const merged = mergeLessonText(english, {
    shared: { commonMistake: 'Erreur commune' },
    lessons: { one: { title: 'Un', checks: ['Premier', ''] } },
  })
  assert.equal(merged.shared.commonMistake, 'Erreur commune')
  assert.equal(merged.shared.bestPractice, english.shared.bestPractice)
  assert.deepEqual(merged.lessons.one, { title: 'Un', topic: 'Box model', checks: ['Premier', 'Second'] })
  assert.deepEqual(merged.lessons.two, english.lessons.two)
  assert.equal(mergeLessonText(english, null), english)
})

test('localized lessons get labels, shared defaults, and a mid sentence topic', () => {
  const data = [
    { id: 'one', checks: [{ type: 'a' }, { type: 'b' }] },
    { id: 'two', checks: [] },
  ]
  const [one, two] = localizeLessons(data, english, 'en')
  assert.deepEqual(one.checks.map((check) => check.label), ['First', 'Second'])
  assert.equal(one.commonMistake, 'Shared mistake')
  assert.equal(one.bestPractice, 'Use the smallest box model rule.')
  assert.equal(two.bestPractice, 'Own advice')
  assert.equal(localizeLessons([{ id: 'two', checks: [] }], { ...english, lessons: { two: { topic: 'Responsive CSS' } } }, 'en')[0].bestPractice,
    'Use the smallest responsive CSS rule.')
})

test('an unknown language loads the English course', async () => {
  const [base, unknown] = await Promise.all([loadStack('html'), loadStack('html', 'xx')])
  assert.equal(unknown.locale, 'xx')
  assert.deepEqual(unknown.lessons.map((lesson) => lesson.title), base.lessons.map((lesson) => lesson.title))
  assert.equal(unknown.lessons.every((lesson) => lesson.checks.every((check) => check.label)), true)
})
