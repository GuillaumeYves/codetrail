export function resetLessonProgress(progress, lessonId) {
  const code = { ...progress.code }
  delete code[lessonId]

  return {
    ...progress,
    code,
    completed: progress.completed.filter((id) => id !== lessonId),
  }
}

export function redoLessonProgress(progress, lessonId) {
  const code = { ...progress.code }
  delete code[lessonId]
  return { ...progress, code }
}

export function resetAllProgress(progress) {
  return {
    ...progress,
    completed: [],
    code: {},
    lastLesson: {},
  }
}

export function isLessonUnlocked(lessons, completedIds, lessonIndex) {
  if (lessonIndex < 0 || lessonIndex >= lessons.length) return false
  if (completedIds.includes(lessons[lessonIndex].id)) return true
  return lessons.slice(0, lessonIndex).every((lesson) => completedIds.includes(lesson.id))
}

export function firstAvailableLessonId(lessons, completedIds) {
  return lessons.find((lesson) => !completedIds.includes(lesson.id))?.id ?? lessons[0]?.id
}
