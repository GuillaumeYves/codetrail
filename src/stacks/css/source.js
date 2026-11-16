// Build-time view of the CSS course: lesson source plus shared English text.
import { cssStackMeta } from './meta.js'
import { cssLessons } from './lessons.js'
import { cssSharedText } from './lessonFactory.js'

export const cssStackSource = {
  ...cssStackMeta,
  lessons: cssLessons,
  sharedText: cssSharedText,
}
