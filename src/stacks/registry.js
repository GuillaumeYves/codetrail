// App-facing stack loader. Lesson data is fetched and hydrated on first use, then cached.
import { htmlStackMeta } from './html/meta.js'
import { cssStackMeta } from './css/meta.js'

const stackDefinitions = {
  html: htmlStackMeta,
  css: cssStackMeta,
}

const publicStackMeta = ({ dataUrl, runtimeLoader, ...meta }) => meta

const stackCache = new Map()

export const stackIds = Object.keys(stackDefinitions)

export const stacks = Object.fromEntries(
  Object.entries(stackDefinitions).map(([id, definition]) => [id, { ...publicStackMeta(definition), lessons: [] }]),
)

async function loadStackData({ dataUrl, name }) {
  // Node (tests) imports the JSON directly; browsers fetch the built asset.
  if (dataUrl.startsWith('file:')) {
    const module = await import(dataUrl, { with: { type: 'json' } })
    return module.default ?? module
  }

  const response = await fetch(dataUrl)
  if (!response.ok) throw new Error(`Failed to load ${name} course data (${response.status})`)
  return response.json()
}

export function loadStack(id) {
  const definition = stackDefinitions[id]
  if (!definition) return Promise.reject(new Error(`Unknown stack: ${id}`))

  if (!stackCache.has(id)) {
    const stackPromise = Promise.all([loadStackData(definition), definition.runtimeLoader()])
      .then(([data, runtime]) => ({
        ...publicStackMeta(definition),
        lessons: runtime.hydrateLessons(id, data.lessons),
      }))
      .catch((error) => {
        // Allow a retry after a failed request.
        stackCache.delete(id)
        throw error
      })

    stackCache.set(id, stackPromise)
  }

  return stackCache.get(id)
}

export async function loadAllStacks() {
  const entries = await Promise.all(stackIds.map(async (id) => [id, await loadStack(id)]))
  return Object.fromEntries(entries)
}
