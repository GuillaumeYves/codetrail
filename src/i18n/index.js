// Interface translations. English ships in the main bundle, other languages load on demand.
import { createContext, use } from 'react'
import en from './locales/en.json'
import { DEFAULT_LOCALE, createTranslator, pickLocale } from './format.js'

const STORAGE_KEY = 'codetrail-locale'
const loaders = import.meta.glob(['./locales/*.json', '!./locales/en.json'], { import: 'default' })
const codeOf = (path) => path.slice('./locales/'.length, -'.json'.length)

export const locales = [DEFAULT_LOCALE, ...Object.keys(loaders).map(codeOf)].sort()

// Saved choice first, then the browser languages.
export function initialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (locales.includes(saved)) return saved
  } catch {
    // Storage can be blocked; detection still works.
  }
  return pickLocale(navigator.languages ?? [navigator.language], locales)
}

export function saveLocale(locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Not persisted, still applied for this visit.
  }
}

// Resolves to the locale actually loaded; a failed download falls back to English.
export async function loadMessages(locale) {
  const load = loaders[`./locales/${locale}.json`]
  if (!load) return { locale: DEFAULT_LOCALE, messages: en }
  try {
    return { locale, messages: await load() }
  } catch {
    return { locale: DEFAULT_LOCALE, messages: en }
  }
}

export const translatorFor = (messages) => createTranslator(messages, en)

export const I18nContext = createContext({ locale: DEFAULT_LOCALE, locales, t: translatorFor(en), setLocale: () => {} })

export const useI18n = () => use(I18nContext)
