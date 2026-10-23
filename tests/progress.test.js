import test from 'node:test'
import assert from 'node:assert/strict'
import { firstAvailableLessonId, isLessonUnlocked, redoLessonProgress, resetAllProgress, resetLessonProgress } from '../src/core/progress.js'

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

test('redo clears only the selected code and preserves completion', () => {
  const current = {
    completed: ['first', 'second'],
    code: { first: 'edited first', second: 'edited second' },
  }

  const redone = redoLessonProgress(current, 'first')
  assert.deepEqual(redone.completed, ['first', 'second'])
  assert.deepEqual(redone.code, { second: 'edited second' })
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
