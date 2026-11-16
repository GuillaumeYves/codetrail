// Serializes each stack's lesson source into the data.json shipped to the browser.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sourceStacks } from '../src/stacks/sourceRegistry.js'

const serializeCheck = (trackId, lesson, check) => {
  const descriptor = check.descriptor ?? check.test?.descriptor
  if (!descriptor) {
    throw new Error(`Missing serializable check descriptor for ${trackId}/${lesson.id}: ${check.label}`)
  }
  return { ...descriptor, label: check.label ?? descriptor.label }
}

// Authoring-only fields stay out; the solution ships for post-completion review.
const serializeLesson = (trackId, lesson) => {
  const { checks, concept, expectedResult, learningSteps, notes, ...lessonData } = lesson
  return {
    ...lessonData,
    bestPractice: lesson.bestPractice ?? sourceStacks[trackId].createBestPractice(lesson),
    checks: checks.map((check) => serializeCheck(trackId, lesson, check)),
  }
}

await Promise.all(Object.entries(sourceStacks).map(async ([trackId, track]) => {
  const payload = { id: trackId, lessons: track.lessons.map((lesson) => serializeLesson(trackId, lesson)) }
  const outputPath = fileURLToPath(track.dataUrl)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}))
