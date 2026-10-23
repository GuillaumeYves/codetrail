import { htmlStackMeta } from './html/meta.js'
import { cssStackMeta } from './css/meta.js'

const stackDefinitions = {
  html: htmlStackMeta,
  css: cssStackMeta,
}

const publicStackMeta = (definition) => {
  const { dataUrl, runtimeLoader, ...meta } = definition
  void dataUrl
  void runtimeLoader
  return meta
}

const stackCache = new Map()

export const stackMeta = Object.fromEntries(
  Object.entries(stackDefinitions).map(([id, definition]) => [id, publicStackMeta(definition)]),
)

export const stacks = Object.fromEntries(
  Object.entries(stackMeta).map(([id, meta]) => [id, { ...meta, lessons: [] }]),
)

async function loadStackData(id) {
  const definition = stackDefinitions[id]

  if (definition.dataUrl.startsWith('file:')) {
    const module = await import(definition.dataUrl, { with: { type: 'json' } })
    return module.default ?? module
  }

  const response = await fetch(definition.dataUrl)
  if (!response.ok) throw new Error(`Failed to load ${definition.name} course data (${response.status})`)
  return response.json()
}

export async function loadStack(id) {
  const definition = stackDefinitions[id]

  if (!definition) {
    throw new Error(`Unknown stack: ${id}`)
  }

  if (!stackCache.has(id)) {
    const stackPromise = Promise.all([
      loadStackData(id),
      definition.runtimeLoader(),
    ])
      .then(([data, runtime]) => ({
        ...publicStackMeta(definition),
        lessons: runtime.hydrateLessons(id, data.lessons),
      }))
      .catch((error) => {
        stackCache.delete(id)
        throw error
      })

    stackCache.set(id, stackPromise)
  }

  return stackCache.get(id)
}

export async function loadAllStacks() {
  const entries = await Promise.all(
    Object.keys(stackDefinitions).map(async (id) => [id, await loadStack(id)]),
  )
  return Object.fromEntries(entries)
}

export const stackIds = Object.keys(stackDefinitions)
