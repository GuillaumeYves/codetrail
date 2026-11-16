import { Languages } from 'lucide-react'
import Dropdown from './Dropdown.jsx'
import { rem } from './rem.js'
import { useI18n } from '../i18n/index.js'

// The name of language `code`, written in language `display`, such as "Français" or "French".
function languageName(code, display) {
  try {
    const name = new Intl.DisplayNames([display], { type: 'language' }).of(code)
    return name.charAt(0).toLocaleUpperCase(display) + name.slice(1)
  } catch {
    return code
  }
}

// Each language is listed in its own name, with its name in the current language below.
// Hidden while English is the only language.
export default function LanguageSelect() {
  const { t, locale, locales, setLocale } = useI18n()
  if (locales.length < 2) return null

  const label = t('topbar.language')
  const options = locales.map((code) => {
    const name = languageName(code, code)
    const local = languageName(code, locale)
    return {
      id: code,
      lang: code,
      name,
      description: local === name ? undefined : local,
      icon: <span className="language-code" aria-hidden="true">{code.toUpperCase()}</span>,
    }
  })

  return (
    <Dropdown
      className="language-picker"
      buttonClass="mode-button"
      label={label}
      title={label}
      menuLabel={label}
      groups={[{ id: 'languages', title: label, options }]}
      value={locale}
      onSelect={setLocale}>
      <Languages size={rem(16)} aria-hidden="true" />
      <span>{languageName(locale, locale)}</span>
    </Dropdown>
  )
}
