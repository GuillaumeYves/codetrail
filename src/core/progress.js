// Pure progress helpers. Lesson ids are prefixed with their stack id, e.g. "html-links".

const STORAGE_KEY = 'codetrail-progress-v1'
const LEGACY_KEYS = ['code-trail-progress-v1', 'practice-react-progress-v1']

const toSet = (ids) => (ids instanceof Set ? ids : new Set(ids))

// Sets or clears (code undefined) the saved code of one lesson.
export function withLessonCode(progress, lessonId, code) {
  if (progress.code[lessonId] === code) return progress
  const next = { ...progress.code }
  if (code === undefined) delete next[lessonId]
  else next[lessonId] = code
  return { ...progress, code: next }
}

export function resetLessonProgress(progress, lessonId) {
  return {
    ...withLessonCode(progress, lessonId),
    completed: progress.completed.filter((id) => id !== lessonId),
  }
}

// Restores starter code but keeps the completion.
export const redoLessonProgress = (progress, lessonId) => withLessonCode(progress, lessonId)

export function resetAllProgress(progress) {
  return { ...progress, completed: [], code: {}, lastLesson: {} }
}

export function completeLesson(progress, lessonId) {
  if (progress.completed.includes(lessonId)) return progress
  return { ...progress, completed: [...progress.completed, lessonId] }
}

// A lesson is open once it is completed or every earlier lesson is.
export function unlockedFlags(lessons, completedIds) {
  const done = toSet(completedIds)
  let open = true
  return lessons.map(({ id }) => {
    const unlocked = open || done.has(id)
    open &&= done.has(id)
    return unlocked
  })
}

export function isLessonUnlocked(lessons, completedIds, index) {
  if (index < 0 || index >= lessons.length) return false
  const done = toSet(completedIds)
  return done.has(lessons[index].id) || lessons.slice(0, index).every(({ id }) => done.has(id))
}

export function firstAvailableLessonId(lessons, completedIds) {
  const done = toSet(completedIds)
  return lessons.find(({ id }) => !done.has(id))?.id ?? lessons[0]?.id
}

// Drops unknown stacks and malformed entries from stored progress.
export function normalizeProgress(raw, stackIds) {
  const base = raw && typeof raw === 'object' ? raw : {}
  const known = (id) => typeof id === 'string' && stackIds.some((stack) => id.startsWith(`${stack}-`))
  const lastLesson = {}

  if (typeof base.lastLesson === 'string' && known(base.lastLesson)) {
    lastLesson[stackIds.find((stack) => base.lastLesson.startsWith(`${stack}-`))] = base.lastLesson
  } else if (base.lastLesson && typeof base.lastLesson === 'object') {
    for (const [stack, id] of Object.entries(base.lastLesson)) {
      if (stackIds.includes(stack) && typeof id === 'string' && id.startsWith(`${stack}-`)) lastLesson[stack] = id
    }
  }

  return {
    completed: Array.isArray(base.completed) ? [...new Set(base.completed.filter(known))] : [],
    code: Object.fromEntries(
      Object.entries(base.code ?? {}).filter(([id, code]) => known(id) && typeof code === 'string'),
    ),
    lastLanguage: stackIds.includes(base.lastLanguage) ? base.lastLanguage : stackIds[0],
    lastLesson,
  }
}

export function loadProgress(stackIds, storage = globalThis.localStorage) {
  try {
    const saved = [STORAGE_KEY, ...LEGACY_KEYS].map((key) => storage.getItem(key)).find(Boolean)
    return normalizeProgress(saved ? JSON.parse(saved) : null, stackIds)
  } catch {
    return normalizeProgress(null, stackIds)
  }
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage full or blocked: progress stays in memory.
  }
}
