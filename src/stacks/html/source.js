// Build-time view of the HTML course: lesson source plus shared English text.
import { htmlStackMeta } from './meta.js'
import { htmlLessons } from './lessons.js'
import { htmlSharedText } from './lessonFactory.js'

export const htmlStackSource = {
  ...htmlStackMeta,
  lessons: htmlLessons,
  sharedText: htmlSharedText,
}
