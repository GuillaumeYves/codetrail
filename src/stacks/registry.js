// App-facing stack loader. Structure, check runtime, and lesson text load on first use, then stay cached.
import { htmlStackMeta } from './html/meta.js'
import { cssStackMeta } from './css/meta.js'
import { jsStackMeta } from './js/meta.js'
import { localizeLessons, mergeLessonText } from '../core/lessonText.js'
import { DEFAULT_LOCALE } from '../i18n/format.js'

const stackDefinitions = {
  html: htmlStackMeta,
  css: cssStackMeta,
  js: jsStackMeta,
}

const publicStackMeta = ({ dataUrl, localeUrl, runtimeLoader, ...meta }) => meta

export const stackIds = Object.keys(stackDefinitions)

export const stacks = Object.fromEntries(
  Object.entries(stackDefinitions).map(([id, definition]) => [id, { ...publicStackMeta(definition), lessons: [] }]),
)

async function loadJson(url, name) {
  // Node (tests) imports the JSON directly; browsers fetch the built asset.
  if (url.startsWith('file:')) {
    const module = await import(url, { with: { type: 'json' } })
    return module.default ?? module
  }

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load ${name} course data (${response.status})`)
  return response.json()
}

// Memoizes a promise but forgets failures so a retry can succeed.
function cached(cache, key, create) {
  if (!cache.has(key)) {
    cache.set(key, create().catch((error) => {
      cache.delete(key)
      throw error
    }))
  }
  return cache.get(key)
}

const baseCache = new Map()
const stackCache = new Map()

// Language-neutral parts plus the English text every locale falls back to.
function loadBase(id) {
  const definition = stackDefinitions[id]
  return cached(baseCache, id, async () => {
    const [data, runtime, english] = await Promise.all([
      loadJson(definition.dataUrl, definition.name),
      definition.runtimeLoader(),
      loadJson(definition.localeUrl(DEFAULT_LOCALE), definition.name),
    ])
    return { data, runtime, english }
  })
}

export function loadStack(id, locale = DEFAULT_LOCALE) {
  const definition = stackDefinitions[id]
  if (!definition) return Promise.reject(new Error(`Unknown stack: ${id}`))

  return cached(stackCache, `${id}:${locale}`, async () => {
    const { data, runtime, english } = await loadBase(id)
    // A missing or broken translation falls back to English.
    const translation = locale !== DEFAULT_LOCALE && data.locales?.includes(locale)
      ? await loadJson(definition.localeUrl(locale), definition.name).catch(() => null)
      : null
    const text = mergeLessonText(english, translation)

    return {
      ...publicStackMeta(definition),
      locale,
      lessons: runtime.hydrateLessons(id, localizeLessons(data.lessons, text, locale), text.shared),
    }
  })
}

export async function loadAllStacks(locale) {
  const entries = await Promise.all(stackIds.map(async (id) => [id, await loadStack(id, locale)]))
  return Object.fromEntries(entries)
}
