// Small message helpers: dotted keys, {param} placeholders, English fallback.

export const DEFAULT_LOCALE = 'en'

// Unknown placeholders stay visible so missing params are easy to spot.
export const format = (template, params = {}) => String(template).replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match))

export const lookup = (messages, key) => key.split('.').reduce((node, part) => node?.[part], messages)

export function createTranslator(messages, fallback = messages) {
  const raw = (key) => lookup(messages, key) ?? lookup(fallback, key)
  const t = (key, params) => {
    const value = raw(key)
    return typeof value === 'string' ? format(value, params) : key
  }
  t.raw = raw
  return t
}

// First supported locale from preferences such as navigator.languages ("fr-CA" matches "fr").
export function pickLocale(preferred, available) {
  for (const tag of preferred) {
    if (typeof tag !== 'string' || !tag) continue
    const wanted = tag.toLowerCase()
    const match = available.find((locale) => locale.toLowerCase() === wanted)
      ?? available.find((locale) => locale.toLowerCase() === wanted.split('-')[0])
    if (match) return match
  }
  return DEFAULT_LOCALE
}
