import { Languages } from 'lucide-react'
import { useI18n } from '../i18n/index.js'

// Each language is listed in its own name, such as "Français".
function autonym(code) {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code)
    return name.charAt(0).toLocaleUpperCase(code) + name.slice(1)
  } catch {
    return code
  }
}

// Hidden while English is the only language.
export default function LanguageSelect() {
  const { t, locale, locales, setLocale } = useI18n()
  if (locales.length < 2) return null

  return (
    <label className="language-select" title={t('topbar.language')}>
      <Languages size={16} aria-hidden="true" />
      <span className="sr-only">{t('topbar.language')}</span>
      <select value={locale} onChange={(event) => setLocale(event.target.value)}>
        {locales.map((code) => (
          <option key={code} value={code} lang={code}>{autonym(code)}</option>
        ))}
      </select>
    </label>
  )
}
