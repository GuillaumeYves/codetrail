import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHTML } from 'linkedom'
import { loadStack } from '../src/stacks/registry.js'
import { jsStackSource } from '../src/stacks/js/source.js'
import { runLessonChecks } from '../src/stacks/js/runner.js'
import { BLANK_PAGE, testSyntax } from '../src/stacks/js/runtime.js'
import { DEFAULT_LOOP_MESSAGE, protectLoops } from '../src/core/loopGuard.js'

const { lessons } = await loadStack('js')
const sources = new Map(jsStackSource.lessons.map((lesson) => [lesson.id, lesson]))

// Same contract as the browser sandbox, with linkedom standing in for the frame.
const execute = ({ html, code, checks, wait }) => {
  const { window, document } = parseHTML(html)
  return runLessonChecks({ window, document, code, checks, wait })
}

const failedLabels = async (lesson, code) => {
  const passed = await lesson.evaluate(code, { execute })
  return lesson.checks.filter((_, index) => !passed[index]).map((check) => check.label)
}

test('JavaScript course has 40 lessons in four stages of ten', () => {
  assert.equal(lessons.length, 40)
  const stages = ['fundamental', 'basic', 'intermediate', 'advanced']
  assert.deepEqual(stages.map((stage) => lessons.filter((lesson) => lesson.group === stage).length), [10, 10, 10, 10])
  assert.deepEqual([...new Set(lessons.map((lesson) => lesson.group))], stages)
  assert.equal(new Set(lessons.map((lesson) => lesson.id)).size, 40)
  assert.deepEqual(lessons.map((lesson) => lesson.difficulty), lessons.map((_, index) => index + 1))
  assert.equal(lessons.every((lesson) => lesson.file === '/script.js'), true)
})

test('every JavaScript lesson starts with the runs-without-errors check', () => {
  for (const lesson of lessons) {
    assert.equal(lesson.checks[0].descriptor.type, 'js-runs', lesson.id)
    assert.ok(lesson.checks.length >= 3, `${lesson.id} needs real checks`)
    assert.equal(lesson.checks.every((check) => check.label), true, lesson.id)
  }
})

test('every page loads the learner script', () => {
  for (const lesson of lessons) {
    assert.match(lesson.files['/index.html'], /<script src="script\.js"><\/script>/, lesson.id)
    assert.equal(lesson.consoleOnly === true, lesson.files['/index.html'] === BLANK_PAGE, lesson.id)
  }
})

// Every starter line survives in the solution, in order, so learners extend code instead of replacing it.
test('solutions build on the starter code', () => {
  for (const lesson of lessons) {
    const remaining = sources.get(lesson.id).solution.split('\n')
    for (const line of lesson.code.split('\n').filter(Boolean)) {
      const at = remaining.indexOf(line)
      assert.ok(at >= 0, `${lesson.id}: ${line}`)
      remaining.splice(0, at + 1)
    }
  }
})

test('every reference solution passes all of its checks', async () => {
  const failures = []
  for (const lesson of lessons) {
    const failed = await failedLabels(lesson, sources.get(lesson.id).solution)
    if (failed.length) failures.push(`${lesson.id}: ${failed.join(' | ')}`)
  }
  assert.deepEqual(failures, [])
})

test('no starter passes before the learner writes code', async () => {
  const passing = []
  for (const lesson of lessons) {
    if (!(await failedLabels(lesson, lesson.code)).length) passing.push(lesson.id)
  }
  assert.deepEqual(passing, [])
})

const lessonById = (id) => lessons.find((lesson) => lesson.id === `js-${id}`)
const withStarter = (id, code) => lessonById(id).code + code

// Other valid answers a learner could reasonably write.
const alternatives = {
  let: 'let score = 0;\nscore = score + 10;\nconsole.log(score);\n',
  'for-loop': 'for (let n = 1; n < 6; n += 1) console.log(n)\n',
  'string-methods': withStarter('string-methods', 'const clean = city.toUpperCase().trim()\nconsole.log(clean)\n'),
  'cart-total': withStarter('cart-total', 'function totalPrice(items) {\n  let total = 0\n  for (let i = 0; i < items.length; i++) total += items[i].price\n  return total\n}\n'),
  'default-params': "const formatPrice = (amount, currency = 'EUR') => amount.toFixed(2) + ' ' + currency\n",
  classes: 'class Counter {\n  count = 0\n  increment() {\n    return ++this.count\n  }\n}\n',
  errors: 'function parseAge(text) {\n  const age = Number(text)\n  if (isNaN(age)) throw new Error(\'Bad age\')\n  return age\n}\nfunction readAge(text) {\n  try {\n    return parseAge(text)\n  } catch (error) {\n    console.warn(error.message)\n    return null\n  }\n}\n',
  'dom-toggle': withStarter('dom-toggle', "button.addEventListener('click', () => {\n  menu.classList.toggle('open')\n  button.setAttribute('aria-expanded', String(menu.classList.contains('open')))\n})\n"),
  capstone: withStarter('capstone', "form.addEventListener('submit', (event) => {\n  event.preventDefault()\n  const text = input.value.trim()\n  if (text === '') return\n  const item = document.createElement('li')\n  item.textContent = text\n  item.addEventListener('click', () => item.classList.toggle('done'))\n  list.append(item)\n  input.value = ''\n  const total = list.querySelectorAll('li').length\n  summary.textContent = total + (total === 1 ? ' task' : ' tasks')\n})\n"),
}

test('checks accept other correct solutions', async () => {
  const failures = []
  for (const [id, code] of Object.entries(alternatives)) {
    const failed = await failedLabels(lessonById(id), code)
    if (failed.length) failures.push(`${id}: ${failed.join(' | ')}`)
  }
  assert.deepEqual(failures, [])
})

// Classic beginner slips, each paired with the requirement that should catch it.
const mistakes = [
  ['const', "const name = 'Ada'\nconsole.log('name')\n", 'The console shows the value of name'],
  ['comparisons', withStarter('comparisons', 'const isAdult = age >= 18\nconst isTwenty = age == 20\n'), 'Does not use =='],
  ['functions', 'function greet(name) {\n  console.log(`Hello, ${name}!`)\n}\n', "greet('Ada') returns Hello, Ada!"],
  ['reduce', withStarter('reduce', 'const total = prices.reduce((sum, price) => sum + price)\n'), 'Starts the total at 0'],
  ['form-submit', withStarter('form-submit', "form.addEventListener('submit', () => {\n  const item = document.createElement('li')\n  item.textContent = input.value\n  list.append(item)\n})\n"), 'Submitting stops the page reload'],
  ['capstone', withStarter('capstone', "form.addEventListener('submit', (event) => {\n  event.preventDefault()\n  const item = document.createElement('li')\n  item.textContent = input.value.trim()\n  list.append(item)\n  input.value = ''\n  summary.textContent = `${list.children.length} tasks`\n})\n"), 'The summary says 1 task'],
]

test('checks catch common mistakes', async () => {
  for (const [id, code, label] of mistakes) {
    assert.ok((await failedLabels(lessonById(id), code)).includes(label), `${id} should fail: ${label}`)
  }
})

test('code that throws fails the runs check and the checks after the error', async () => {
  const lesson = lessons.find((item) => item.id === 'js-const')
  const failed = await failedLabels(lesson, "const name = 'Ada'\nconsole.log(nme)\n")
  assert.deepEqual(failed, [lesson.checks[0].label, ...lesson.checks.slice(2).filter((check) => check.descriptor.type !== 'js-syntax').map((check) => check.label)])
})

test('loop guard stops runaway loops with a readable error', () => {
  for (const code of ['while (true) {}', 'for (;;) x++', 'let i = 0\ndo { i = 1 } while (i)']) {
    const guarded = protectLoops(`let x = 0\n${code}`)
    assert.equal(guarded.split('\n').length, code.split('\n').length + 1, 'keeps line numbers')
    assert.throws(() => new Function(guarded)(), { name: 'RangeError', message: DEFAULT_LOOP_MESSAGE })
  }
})

test('loop guard leaves finite loops, loop-free code, and broken code alone', () => {
  const finite = protectLoops('let total = 0\nfor (let i = 0; i < 5000; i++) total += i\nreturn total', 'Stopped')
  assert.equal(new Function(finite)(), 12497500)
  assert.equal(protectLoops('const a = 1'), 'const a = 1')
  assert.equal(protectLoops('while ('), 'while (')
})

test('syntax checks read declarations, calls, and nodes', () => {
  const code = "const { title, year } = movie\nlet [first] = list\nfunction greet() {}\nclass Box {}\nconsole.log(title.trim())\n// const hidden = 1\n"
  assert.equal(testSyntax({ declares: 'title', kind: 'const' }, code), true)
  assert.equal(testSyntax({ declares: 'year' }, code), true)
  assert.equal(testSyntax({ declares: 'first', kind: 'let' }, code), true)
  assert.equal(testSyntax({ declares: 'first', kind: 'const' }, code), false)
  assert.equal(testSyntax({ declares: 'greet', kind: 'function' }, code), true)
  assert.equal(testSyntax({ declares: 'Box', kind: 'class' }, code), true)
  assert.equal(testSyntax({ declares: 'hidden' }, code), false)
  assert.equal(testSyntax({ calls: 'console.log' }, code), true)
  assert.equal(testSyntax({ calls: 'trim' }, code), true)
  assert.equal(testSyntax({ calls: 'map' }, code), false)
  assert.equal(testSyntax({ node: 'ObjectPattern' }, code), true)
  assert.equal(testSyntax({ node: 'ArrowFunction', absent: true }, code), true)
})
