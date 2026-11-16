import { useEffect, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { version } from '../../package.json'
import { useI18n } from '../i18n/index.js'
import { rem } from './rem.js'

export default function Faq({ open, onToggle, onClose }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(0)
  const items = t.raw('faq.items') ?? []

  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  return (
    <div className="faq-widget">
      {/* Always mounted so it can fade out as well as in. */}
      <section className={open ? 'faq-dialog open' : 'faq-dialog'} role="dialog" aria-labelledby="faq-title" inert={!open}>
        <div className="faq-header">
          <div>
            <span>{t('faq.version', { version })}</span>
            <h2 id="faq-title">{t('faq.title')}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t('faq.closeDialog')}>
            <X size={rem(18)} />
          </button>
        </div>
        <div className="faq-list">
          {items.map((item, index) => {
            const isExpanded = expanded === index
            return (
              <div className="faq-item" key={index}>
                <button type="button" aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? -1 : index)}>
                  <span>{item.question}</span>
                  <ChevronDown className={isExpanded ? 'rotated' : ''} size={rem(16)} />
                </button>
                <div className={isExpanded ? 'faq-answer open' : 'faq-answer'} inert={!isExpanded}>
                  <p>{item.answer}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>
      <button
        className="faq-trigger"
        type="button"
        onClick={onToggle}
        aria-label={t(open ? 'faq.close' : 'faq.open')}
        aria-expanded={open}>
        {open ? <X size={rem(20)} /> : '?'}
      </button>
    </div>
  )
}
