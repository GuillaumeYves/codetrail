import { htmlStackMeta } from './meta.js'
import { htmlLessons } from './lessons.js'
import { createBestPractice } from './runtime.js'

export const htmlStackSource = {
  ...htmlStackMeta,
  lessons: htmlLessons,
  createBestPractice,
}
