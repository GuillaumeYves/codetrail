import test from 'node:test'
import assert from 'node:assert/strict'
import {
  completeLesson,
  firstAvailableLessonId,
  isLessonUnlocked,
  loadProgress,
  normalizeProgress,
  redoLessonProgress,
  resetAllProgress,
  resetLessonProgress,
  saveProgress,
  unlockedFlags,
  withLessonCode,
} from '../src/core/progress.js'

const memoryStorage = (entries = {}) => {
  const data = new Map(Object.entries(entries))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    data,
  }
}

test('reset removes saved code and completion only for the active lesson', () => {
  const current = {
    completed: ['first', 'second'],
    code: { first: 'edited first', second: 'edited second' },
    lastLanguage: 'html',
  }

  const reset = resetLessonProgress(current, 'first')

  assert.deepEqual(reset.completed, ['second'])
  assert.deepEqual(reset.code, { second: 'edited second' })
  assert.equal(reset.lastLanguage, 'html')
  assert.deepEqual(current.completed, ['first', 'second'], 'input is not mutated')
})

test('lessons unlock sequentially while completed lessons remain revisitable', () => {
  const lessons = [{ id: 'one' }, { id: 'two' }, { id: 'three' }]

  assert.equal(isLessonUnlocked(lessons, [], 0), true)
  assert.equal(isLessonUnlocked(lessons, [], 1), false)
  assert.equal(isLessonUnlocked(lessons, ['one'], 1), true)
  assert.equal(isLessonUnlocked(lessons, ['two'], 1), true)
  assert.equal(isLessonUnlocked(lessons, ['two'], 2), false)
  assert.equal(isLessonUnlocked(lessons, ['one', 'two'], 2), true)
  assert.equal(firstAvailableLessonId(lessons, ['one']), 'two')
  assert.equal(firstAvailableLessonId(lessons, ['one', 'two', 'three']), 'one')
})

test('unlockedFlags matches isLessonUnlocked for every lesson in one pass', () => {
  const lessons = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }))
  const scenarios = [[], ['a'], ['a', 'b'], ['b', 'd'], ['a', 'c', 'e'], ['a', 'b', 'c', 'd', 'e']]

  for (const completed of scenarios) {
    assert.deepEqual(
      unlockedFlags(lessons, new Set(completed)),
      lessons.map((_, index) => isLessonUnlocked(lessons, completed, index)),
      completed.join(','),
    )
  }
})

test('redo clears only the selected code and preserves completion', () => {
  const current = {
    completed: ['first', 'second'],
    code: { first: 'edited first', second: 'edited second' },
  }

  const redone = redoLessonProgress(current, 'first')
  assert.deepEqual(redone.completed, ['first', 'second'])
  assert.deepEqual(redone.code, { second: 'edited second' })
})

test('withLessonCode returns the same object when nothing changes', () => {
  const current = { completed: [], code: { a: 'x' } }
  assert.equal(withLessonCode(current, 'a', 'x'), current)
  assert.equal(withLessonCode(current, 'b', undefined), current)
  assert.deepEqual(withLessonCode(current, 'a', 'y').code, { a: 'y' })
  assert.deepEqual(withLessonCode(current, 'a', undefined).code, {})
})

test('completeLesson adds an id once', () => {
  const current = { completed: ['a'], code: {} }
  assert.equal(completeLesson(current, 'a'), current)
  assert.deepEqual(completeLesson(current, 'b').completed, ['a', 'b'])
})

test('global reset clears every language completion, code, and last lesson', () => {
  const current = {
    completed: ['html-one', 'html-two'],
    code: { 'html-one': 'edited', 'html-two': 'edited' },
    lastLesson: { html: 'html-one' },
    lastLanguage: 'html',
  }

  const reset = resetAllProgress(current)
  assert.deepEqual(reset.completed, [])
  assert.deepEqual(reset.code, {})
  assert.deepEqual(reset.lastLesson, {})
  assert.equal(reset.lastLanguage, 'html')
})

test('normalizeProgress drops unknown stacks and malformed entries', () => {
  const stackIds = ['html', 'css']
  const normalized = normalizeProgress({
    completed: ['html-a', 'html-a', 'js-b', 42],
    code: { 'css-x': 'body {}', 'py-y': 'print()', 'html-z': 7 },
    lastLanguage: 'ruby',
    lastLesson: { html: 'html-a', css: 'html-b', go: 'go-c' },
  }, stackIds)

  assert.deepEqual(normalized, {
    completed: ['html-a'],
    code: { 'css-x': 'body {}' },
    lastLanguage: 'html',
    lastLesson: { html: 'html-a' },
  })
  assert.deepEqual(normalizeProgress({ lastLesson: 'css-grid' }, stackIds).lastLesson, { css: 'css-grid' })
  assert.deepEqual(normalizeProgress(null, stackIds).completed, [])
})

test('progress round-trips through storage and reads legacy keys', () => {
  const storage = memoryStorage({ 'code-trail-progress-v1': JSON.stringify({ completed: ['css-a'], lastLanguage: 'css' }) })
  const loaded = loadProgress(['html', 'css'], storage)
  assert.deepEqual(loaded.completed, ['css-a'])
  assert.equal(loaded.lastLanguage, 'css')

  saveProgress(loaded, storage)
  assert.deepEqual(loadProgress(['html', 'css'], storage), loaded)
})

test('loadProgress survives broken JSON and missing storage', () => {
  assert.equal(loadProgress(['html'], memoryStorage({ 'codetrail-progress-v1': '{oops' })).lastLanguage, 'html')
  assert.equal(loadProgress(['html'], undefined).lastLanguage, 'html')
})
