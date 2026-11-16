import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYGROUND_TEMPLATE, decodeShare, encodeShare, loadPlayground, savePlayground } from '../src/core/playground.js'

const memoryStorage = () => {
  const data = new Map()
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}

test('share links round-trip unicode code and stay URL safe', async () => {
  const files = { html: '<p>Café ✓</p>', css: 'p { color: #f00; }', js: 'console.log("a+b/c=d")' }
  const encoded = await encodeShare(files)

  assert.match(encoded, /^[A-Za-z0-9_-]+$/)
  assert.deepEqual(await decodeShare(encoded), files)
})

test('share links compress repetitive code', async () => {
  const html = '<li>item</li>\n'.repeat(500)
  const encoded = await encodeShare({ html, css: '', js: '' })
  assert.ok(encoded.length < html.length / 10)
})

test('invalid share links are rejected', async () => {
  await assert.rejects(decodeShare('not-a-real-link'))
  await assert.rejects(decodeShare(await encodeShare({ html: 1, css: '', js: '' })))
})

test('playground falls back to the template and persists edits', () => {
  const storage = memoryStorage()
  assert.deepEqual(loadPlayground(storage), PLAYGROUND_TEMPLATE)

  const files = { html: '<b>x</b>', css: '', js: '' }
  savePlayground(files, storage)
  assert.deepEqual(loadPlayground(storage), files)
})
