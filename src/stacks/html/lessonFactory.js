import { createCheckFromDescriptor, createRegexCheck, createTokenCheck as createRuntimeTokenCheck } from './runtime.js'

// Stage ids are translated in the UI (stages.<id>).
const stageRanges = [
  { group: 'fundamental', start: 0, size: 13 },
  { group: 'basic', start: 13, size: 13 },
  { group: 'intermediate', start: 26, size: 12 },
  { group: 'advanced', start: 38, size: 12 },
]

// English text shared by every lesson unless a lesson overrides it. {topic} is the lesson topic.
export const htmlSharedText = {
  commonMistake: 'Focus on the semantic element and the required attributes first. Your visible text can be personal unless the task asks for exact machine-readable values such as ids, URLs, names, or dates.',
  bestPractice: 'Build the smallest valid HTML that proves the {topic} idea first, then personalize visible text once the semantic structure is correct.',
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

const feedbackNote = 'The page preview renders your HTML automatically. Fix malformed tags or nesting if the browser output looks different from the task.'
const machineReadablePattern = /\b(?:id|href|src|srcset|name|type|datetime|aria-[\w-]+|for|rel|method|action|charset|content|value|pattern|minlength|maxlength|scope|srclang|autocomplete|controls|required|open)\b/i

const createLearningSteps = (spec) => spec.learningSteps ?? [
  {
    title: 'Understand the idea',
    text: spec.termNote,
  },
  {
    title: 'Build the smallest valid markup',
    text: spec.buildStep ?? `Start with ${spec.term}, then add only the structure or attributes the task asks for.`,
  },
  {
    title: 'Make it yours',
    text: machineReadablePattern.test(spec.objective)
      ? 'Use your own visible words, but keep machine-readable values connected and intentional: ids, URLs, names, dates, input types, and ARIA references must still make sense.'
      : 'Use your own visible words. The checks care about the HTML meaning and structure, not copying a sentence from an example.',
  },
]

function createCheck(label, pattern, preserveComments = false) {
  if (pattern?.type) return createCheckFromDescriptor('html', { label, ...pattern })
  return createRegexCheck('html', label, pattern, preserveComments)
}

function createTokenCheck(label, token, preserveComments = false) {
  return createRuntimeTokenCheck('html', label, token, preserveComments)
}

export function createHtmlLessons(specs) {
  return specs.map((spec, index) => ({
    id: `html-${spec.id}`,
    number: String(index + 1).padStart(2, '0'),
    group: stageForIndex(index),
    ...stageProgressForIndex(index),
    title: spec.title,
    topic: spec.topic,
    summary: spec.summary ?? spec.concept,
    objective: spec.objective,
    concept: spec.concept,
    learningSteps: createLearningSteps(spec),
    hints: spec.hints,
    notes: [
      { term: spec.term, text: spec.termNote },
      { term: 'index.html', text: spec.fileNote ?? 'This lesson runs from index.html. Write valid HTML here and the browser preview updates automatically.' },
      { term: 'Live feedback', text: feedbackNote },
    ],
    // Left undefined to use the shared text.
    commonMistake: spec.mistake,
    bestPractice: spec.bestPractice,
    checks: [
      ...(spec.checks ?? []).map(([label, pattern]) => createCheck(label, pattern, spec.preserveComments)),
      ...(spec.required ?? []).map(([label, token]) => createTokenCheck(label, token, spec.preserveComments)),
    ],
    code: spec.code,
    solution: spec.solution,
    file: '/index.html',
  }))
}
