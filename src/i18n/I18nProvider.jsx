import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { I18nContext, loadMessages, locales, saveLocale, translatorFor } from './index.js'

export default function I18nProvider({ initial, children }) {
  const [current, setCurrent] = useState(initial)
  const requested = useRef(initial.locale)

  useEffect(() => {
    document.documentElement.lang = current.locale
  }, [current.locale])

  // Keeps the current language on screen until the new one has loaded.
  const setLocale = useCallback(async (locale) => {
    requested.current = locale
    const next = await loadMessages(locale)
    if (requested.current !== locale) return
    saveLocale(next.locale)
    setCurrent(next)
  }, [])

  const value = useMemo(
    () => ({ locale: current.locale, locales, t: translatorFor(current.messages), setLocale }),
    [current, setLocale],
  )

  return <I18nContext value={value}>{children}</I18nContext>
}
