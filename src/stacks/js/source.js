// Build-time view of the JavaScript course: lesson source plus shared English text.
import { jsStackMeta } from './meta.js'
import { jsLessons } from './lessons.js'
import { jsSharedText } from './lessonFactory.js'

export const jsStackSource = {
  ...jsStackMeta,
  lessons: jsLessons,
  sharedText: jsSharedText,
}
