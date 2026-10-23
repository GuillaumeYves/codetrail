import { createCheckFromDescriptor } from './runtime.js'

const stageRanges = [
  { group: 'Fundamental', start: 0, size: 10 },
  { group: 'Basic', start: 10, size: 10 },
  { group: 'Intermediate', start: 20, size: 10 },
  { group: 'Advanced', start: 30, size: 10 },
]

const stageForIndex = (index) => stageRanges.find(({ start, size }) => index >= start && index < start + size)?.group ?? 'Advanced'
const stageProgressForIndex = (index) => {
  const range = stageRanges.find(({ start, size }) => index >= start && index < start + size) ?? stageRanges.at(-1)
  return {
    difficulty: index + 1,
    stageStep: index - range.start + 1,
    stageSize: range.size,
  }
}

const defaultCommonMistake = 'CSS requirements look for the selector and declaration that affect the preview. Extra rules are fine, but styling the wrong class or writing the property outside the right rule will not complete the step.'
const focusedBestPractice = (lesson) => `Start with the smallest ${lesson.topic.toLowerCase()} rule that changes the preview, then adjust values once the target element clearly responds.`

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
    eyebrow: spec.topic,
    summary: spec.summary ?? spec.concept,
    objective: spec.objective,
    hint: spec.hint,
    commonMistake: spec.mistake ?? defaultCommonMistake,
    bestPractice: spec.bestPractice ?? focusedBestPractice(spec),
    checks: (spec.checks ?? []).map(([label, descriptor]) => createCheck(label, descriptor)),
    code: spec.code,
    solution: spec.solution,
    file: '/styles.css',
    files: spec.files,
  }))
}
