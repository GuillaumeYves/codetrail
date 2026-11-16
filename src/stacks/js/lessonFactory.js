import { BLANK_PAGE } from './runtime.js'

// Stage ids are translated in the UI (stages.<id>).
const stageRanges = [
  { group: 'fundamental', start: 0, size: 10 },
  { group: 'basic', start: 10, size: 10 },
  { group: 'intermediate', start: 20, size: 10 },
  { group: 'advanced', start: 30, size: 10 },
]

// English text shared by every lesson unless a lesson overrides it. {topic} is the lesson topic.
export const jsSharedText = {
  commonMistake: 'Read the console under the preview first. One red error stops the rest of the script, so fix the first error before anything else.',
  bestPractice: 'Write the smallest piece of {topic} code that works, run it, then improve names and structure once every check passes.',
  runsCheck: 'Your code runs without errors',
}

const rangeFor = (index) => stageRanges.find(({ start, size }) => index >= start && index < start + size) ?? stageRanges.at(-1)

export function createJsLessons(specs) {
  return specs.map((spec, index) => {
    const range = rangeFor(index)
    return {
      id: `js-${spec.id}`,
      number: String(index + 1).padStart(2, '0'),
      group: range.group,
      difficulty: index + 1,
      stageStep: index - range.start + 1,
      stageSize: range.size,
      title: spec.title,
      topic: spec.topic,
      summary: spec.summary,
      objective: spec.objective,
      hints: spec.hints,
      // Left undefined to use the shared text.
      commonMistake: spec.mistake,
      bestPractice: spec.bestPractice,
      checks: spec.checks.map(([label, descriptor]) => ({ label, descriptor })),
      code: spec.code ?? '',
      solution: spec.solution,
      file: '/script.js',
      // Lessons without a page only show the console.
      files: { '/index.html': spec.page ?? BLANK_PAGE },
      consoleOnly: spec.page ? undefined : true,
      wait: spec.wait,
    }
  })
}
