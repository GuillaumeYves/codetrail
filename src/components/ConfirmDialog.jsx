import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useI18n } from '../i18n/index.js'
import { rem } from './rem.js'

const GLOBAL_RESET_DELAY = 3

// Reset confirmation. The global reset stays locked for a few seconds to avoid accidents.
export default function ConfirmDialog({ type, lessonTitle, trackName, onCancel, onConfirm }) {
  const { t } = useI18n()
  const isGlobal = type === 'all'
  const [remaining, setRemaining] = useState(isGlobal ? GLOBAL_RESET_DELAY : 0)

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onCancel])

  useEffect(() => {
    if (remaining <= 0) return undefined
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [remaining])

  const copy = isGlobal ? 'confirm.all' : 'confirm.redo'

  return (
    <div
      className="confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}>
      <section
        className={isGlobal ? 'confirm-dialog danger' : 'confirm-dialog'}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-confirm-title"
        aria-describedby="reset-confirm-description">
        <div className="confirm-icon">
          <RotateCcw size={rem(18)} />
        </div>
        <div className="confirm-copy">
          <span>{t(`${copy}.label`)}</span>
          <h2 id="reset-confirm-title">{t(`${copy}.title`)}</h2>
          <p id="reset-confirm-description">{t(`${copy}.text`, { course: trackName, lesson: lessonTitle })}</p>
        </div>

        {isGlobal && (
          <div className="confirm-wait">
            <div className="confirm-timer" aria-hidden="true">
              <i />
            </div>
          </div>
        )}

        <div className="confirm-actions">
          <button className="confirm-cancel" type="button" onClick={onCancel} autoFocus>
            {t('confirm.cancel')}
          </button>
          <button className="confirm-reset" type="button" onClick={onConfirm} disabled={remaining > 0}>
            {remaining > 0 ? t('confirm.seconds', { seconds: remaining }) : t(`${copy}.action`)}
          </button>
        </div>
      </section>
    </div>
  )
}
