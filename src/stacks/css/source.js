import { cssStackMeta } from './meta.js'
import { cssLessons } from './lessons.js'
import { createBestPractice } from './runtime.js'

export const cssStackSource = {
  ...cssStackMeta,
  lessons: cssLessons,
  createBestPractice,
}
