import { createCheckFromDescriptor } from './runtime.js'

// Stage ids are translated in the UI (stages.<id>).
const stageRanges = [
  { group: 'fundamental', start: 0, size: 10 },
  { group: 'basic', start: 10, size: 10 },
  { group: 'intermediate', start: 20, size: 10 },
  { group: 'advanced', start: 30, size: 10 },
]

// English text shared by every lesson unless a lesson overrides it. {topic} is the lesson topic.
export const cssSharedText = {
  commonMistake: 'CSS requirements look for the selector and declaration that affect the preview. Extra rules are fine, but styling the wrong class or writing the property outside the right rule will not complete the step.',
  bestPractice: 'Start with the smallest {topic} rule that changes the preview, then adjust values once the target element clearly responds.',
  semicolonCheck: 'Every CSS declaration ends with a semicolon',
}

const stageForIndex = (index) => stageRanges.find(({ start, size }) => index >= start && index < start + size)?.group ?? 'advanced'
const stageProgressForIndex = (index) => {
  const range = stageRanges.find(({ start, size }) => index >= start && index < start + size) ?? stageRanges.at(-1)
  return {
    difficulty: index + 1,
    stageStep: index - range.start + 1,
    stageSize: range.size,
  }
}

function createCheck(label, descriptor) {
  return createCheckFromDescriptor({ label, ...descriptor })
}

export function createCssLessons(specs) {
  return specs.map((spec, index) => ({
    id: `css-${spec.id}`,
    number: String(index + 1).padStart(2, '0'),
    group: stageForIndex(index),
    ...stageProgressForIndex(index),
    title: spec.title,
    topic: spec.topic,
    summary: spec.summary ?? spec.concept,
    objective: spec.objective,
    hint: spec.hint,
    // Left undefined to use the shared text.
    commonMistake: spec.mistake,
    bestPractice: spec.bestPractice,
    checks: (spec.checks ?? []).map(([label, descriptor]) => createCheck(label, descriptor)),
    code: spec.code,
    solution: spec.solution,
    file: '/styles.css',
    files: spec.files,
  }))
}
