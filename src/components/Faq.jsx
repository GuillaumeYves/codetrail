import { useEffect, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { version } from '../../package.json'
import { useI18n } from '../i18n/index.js'

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
      {open && (
        <section className="faq-dialog" role="dialog" aria-labelledby="faq-title">
          <div className="faq-header">
            <div>
              <span>{t('faq.version', { version })}</span>
              <h2 id="faq-title">{t('faq.title')}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label={t('faq.closeDialog')}>
              <X size={18} />
            </button>
          </div>
          <div className="faq-list">
            {items.map((item, index) => {
              const isExpanded = expanded === index
              return (
                <div className="faq-item" key={index}>
                  <button type="button" aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? -1 : index)}>
                    <span>{item.question}</span>
                    <ChevronDown className={isExpanded ? 'rotated' : ''} size={16} />
                  </button>
                  {isExpanded && <p>{item.answer}</p>}
                </div>
              )
            })}
          </div>
        </section>
      )}
      <button
        className="faq-trigger"
        type="button"
        onClick={onToggle}
        aria-label={t(open ? 'faq.close' : 'faq.open')}
        aria-expanded={open}>
        {open ? <X size={20} /> : '?'}
      </button>
    </div>
  )
}
