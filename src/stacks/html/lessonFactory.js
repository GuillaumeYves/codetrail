import { createCheckFromDescriptor, createRegexCheck, createTokenCheck as createRuntimeTokenCheck } from './runtime.js'

const stageRanges = [
  { group: 'Fundamental', start: 0, size: 13 },
  { group: 'Basic', start: 13, size: 13 },
  { group: 'Intermediate', start: 26, size: 12 },
  { group: 'Advanced', start: 38, size: 12 },
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

const feedbackNote = 'The page preview renders your HTML automatically. Fix malformed tags or nesting if the browser output looks different from the task.'
const defaultCommonMistake = 'HTML checks focus on the required element, attributes, and meaningful text. Extra words or punctuation are usually fine, but missing tags, broken nesting, or mismatched attributes change the document meaning.'
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
    eyebrow: spec.topic,
    summary: spec.summary ?? spec.concept,
    objective: spec.objective,
    concept: spec.concept,
    learningSteps: createLearningSteps(spec),
    hint: spec.hint,
    notes: [
      { term: spec.term, text: spec.termNote },
      { term: 'index.html', text: spec.fileNote ?? 'This lesson runs from index.html. Write valid HTML here and the browser preview updates automatically.' },
      { term: 'Live feedback', text: feedbackNote },
    ],
    commonMistake: spec.mistake ?? defaultCommonMistake,
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
