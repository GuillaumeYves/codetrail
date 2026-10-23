import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sourceStacks } from '../src/stacks/sourceRegistry.js'

const serializeCheck = (trackId, lesson, check) => {
  const descriptor = check.descriptor ?? check.test?.descriptor

  if (!descriptor) {
    throw new Error(`Missing serializable check descriptor for ${trackId}/${lesson.id}: ${check.label}`)
  }

  return {
    ...descriptor,
    label: check.label ?? descriptor.label,
  }
}

const serializeLesson = (trackId, lesson) => {
  const {
    checks,
    concept,
    expectedResult,
    learningSteps,
    notes,
    solution,
    ...lessonData
  } = lesson
  const createBestPractice = sourceStacks[trackId].createBestPractice
  void concept
  void expectedResult
  void learningSteps
  void notes
  void solution

  return {
    ...lessonData,
    bestPractice: lesson.bestPractice ?? createBestPractice(lesson),
    checks: checks.map((check) => serializeCheck(trackId, lesson, check)),
  }
}

for (const [trackId, track] of Object.entries(sourceStacks)) {
  const payload = {
    id: trackId,
    lessons: track.lessons.map((lesson) => serializeLesson(trackId, lesson)),
  }

  const serializedPayload = JSON.stringify(payload, null, 2)
  const outputPath = fileURLToPath(track.dataUrl)

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${serializedPayload}\n`, 'utf8')
}
