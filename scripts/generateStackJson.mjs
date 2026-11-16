// Splits each stack's lesson source into data.json (structure) and locales/en.json (English text).
// Translations are hand written next to en.json (fr.json, es.json...) and listed in data.json.
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { sourceStacks } from '../src/stacks/sourceRegistry.js'

const TEXT_FIELDS = new Set(['title', 'topic', 'summary', 'objective', 'hint', 'commonMistake', 'bestPractice'])
const AUTHORING_FIELDS = new Set(['concept', 'expectedResult', 'learningSteps', 'notes'])

const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')

function serializeCheck(stackId, lesson, check) {
  const descriptor = check.descriptor ?? check.test?.descriptor
  if (!descriptor) {
    throw new Error(`Missing serializable check descriptor for ${stackId}/${lesson.id}: ${check.label}`)
  }
  const { label, ...structure } = descriptor
  return { structure, label: check.label ?? label }
}

function splitLesson(stackId, lesson) {
  const data = {}
  const text = {}
  for (const [key, value] of Object.entries(lesson)) {
    if (value === undefined || key === 'checks' || AUTHORING_FIELDS.has(key)) continue
    if (TEXT_FIELDS.has(key)) text[key] = value
    else data[key] = value
  }
  const checks = lesson.checks.map((check) => serializeCheck(stackId, lesson, check))
  data.checks = checks.map((check) => check.structure)
  text.checks = checks.map((check) => check.label)
  return { data, text }
}

await Promise.all(Object.entries(sourceStacks).map(async ([stackId, stack]) => {
  const localesDir = fileURLToPath(new URL('./locales/', stack.dataUrl))
  await mkdir(localesDir, { recursive: true })

  const split = stack.lessons.map((lesson) => splitLesson(stackId, lesson))
  await writeJson(`${localesDir}en.json`, {
    shared: stack.sharedText,
    lessons: Object.fromEntries(split.map(({ data, text }) => [data.id, text])),
  })

  const locales = (await readdir(localesDir)).filter((file) => file.endsWith('.json')).map((file) => file.slice(0, -5)).sort()
  await writeJson(fileURLToPath(stack.dataUrl), { id: stackId, locales, lessons: split.map(({ data }) => data) })
}))
