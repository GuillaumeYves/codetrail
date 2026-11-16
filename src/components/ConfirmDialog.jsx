import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'

const GLOBAL_RESET_DELAY = 3

// Reset confirmation. The global reset stays locked for a few seconds to avoid accidents.
export default function ConfirmDialog({ type, lessonTitle, trackName, onCancel, onConfirm }) {
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

  const title = isGlobal ? 'Reset all data?' : 'Redo this task?'
  const description = isGlobal
    ? `This clears every completed challenge and every saved editor change in every course. You will return to the first ${trackName} lesson.`
    : `This restores the starter code for "${lessonTitle}". The task stays marked as completed if you already finished it.`

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
          <RotateCcw size={18} />
        </div>
        <div className="confirm-copy">
          <span>{isGlobal ? 'DESTRUCTIVE RESET' : 'TASK RESET'}</span>
          <h2 id="reset-confirm-title">{title}</h2>
          <p id="reset-confirm-description">{description}</p>
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
            Cancel
          </button>
          <button className="confirm-reset" type="button" onClick={onConfirm} disabled={remaining > 0}>
            {remaining > 0 ? `${remaining}s` : isGlobal ? 'Reset all data' : 'Redo task'}
          </button>
        </div>
      </section>
    </div>
  )
}
