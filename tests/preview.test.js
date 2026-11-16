import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPreviewDoc } from '../src/core/preview.js'

const page = `<!doctype html>
<html lang="en">
<head>
  <title>x</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <p>Hi</p>
  <script src="script.js"></script>
</body>
</html>`

test('inlines the linked stylesheet and script where they were referenced', () => {
  const doc = buildPreviewDoc({ html: page, css: 'p { color: red; }', js: 'console.log(1)' })

  assert.doesNotMatch(doc, /href="\/styles\.css"/)
  assert.doesNotMatch(doc, /src="script\.js"/)
  assert.match(doc, /<title>x<\/title>\s*<style id="__ct-css">p \{ color: red; \}<\/style>/)
  assert.match(doc, /<p>Hi<\/p>\s*<script>console\.log\(1\)/)
})

test('injects the runtime and base styles at the start of head', () => {
  const doc = buildPreviewDoc({ html: page, baseCss: 'body { margin: 0; }' })
  const head = doc.indexOf('<head>')
  const runtime = doc.indexOf('<script>(() => {')
  const base = doc.indexOf('<style>body { margin: 0; }</style>')

  assert.ok(head < runtime && runtime < base && base < doc.indexOf('<title>'))
})

test('wraps fragments in a standards mode document', () => {
  const doc = buildPreviewDoc({ html: '<h1>Hello</h1>', css: 'h1 { color: blue; }', js: 'let a = 1' })

  assert.match(doc, /^<!doctype html>/)
  assert.match(doc, /<style id="__ct-css">h1 \{ color: blue; \}<\/style>/)
  assert.ok(doc.indexOf('<h1>Hello</h1>') < doc.lastIndexOf('<script>let a = 1'))
})

test('places the script before </body> when it is not referenced', () => {
  const doc = buildPreviewDoc({ html: '<html><head></head><body><p>x</p></body></html>', js: 'run()' })
  assert.match(doc, /<p>x<\/p><script>run\(\)\n<\/script><\/body>/)
})

test('user code cannot close its own style or script element', () => {
  const doc = buildPreviewDoc({ html: '<p>x</p>', css: 'a::after { content: "</style>"; }', js: 'const s = "</script>"' })

  assert.match(doc, /content: "<\\\/style>"/)
  assert.match(doc, /const s = "<\\\/script>"/)
})

test('skips the script element when there is no JavaScript', () => {
  const doc = buildPreviewDoc({ html: page, js: '  ' })
  assert.doesNotMatch(doc, /src="script\.js"/)
  assert.equal(doc.match(/<script>/g).length, 1, 'only the runtime script remains')
})
