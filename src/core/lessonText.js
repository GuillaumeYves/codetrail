// Lesson text lives in locales/<lang>.json, keyed by lesson id. data.json only holds structure.
import { format } from '../i18n/format.js'

// Overlays a translation on the English text field by field, so partial translations work.
export function mergeLessonText(english, translation) {
  if (!translation) return english

  const lessons = {}
  for (const [id, text] of Object.entries(english.lessons)) {
    const translated = translation.lessons?.[id] ?? {}
    lessons[id] = {
      ...text,
      ...translated,
      checks: text.checks.map((label, index) => translated.checks?.[index] || label),
    }
  }
  return { shared: { ...english.shared, ...translation.shared }, lessons }
}

// "Box model" reads as "box model" mid sentence, while "HTML" or "CSS" keep their case.
const midSentence = (topic = '', locale) => topic.replace(/^\p{Lu}(?=\p{Ll})/u, (letter) => letter.toLocaleLowerCase(locale))

// Joins language-neutral lesson data with its text and fills shared defaults.
export function localizeLessons(lessons, text, locale) {
  return lessons.map((lesson) => {
    const { checks: labels = [], ...entry } = text.lessons[lesson.id] ?? {}
    return {
      ...lesson,
      ...entry,
      commonMistake: entry.commonMistake ?? text.shared.commonMistake,
      bestPractice: entry.bestPractice
        ?? format(text.shared.bestPractice, { topic: midSentence(entry.topic, locale) }),
      checks: lesson.checks.map((check, index) => ({ ...check, label: labels[index] ?? '' })),
    }
  })
}
