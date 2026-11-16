import { useEffect, useRef } from 'react'
import { Eraser } from 'lucide-react'
import { useI18n } from '../i18n/index.js'
import { rem } from './rem.js'

export default function Console({ logs, onClear, className = '' }) {
  const { t } = useI18n()
  const list = useRef(null)

  // Keep the newest line in view.
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight
  }, [logs])

  return (
    <div className={`console ${className}`.trim()}>
      <div className="console-bar">
        <span>
          {t('console.title')} {logs.length > 0 && <b>{logs.length}</b>}
        </span>
        <button type="button" onClick={onClear} aria-label={t('console.clear')} title={t('console.clear')}>
          <Eraser size={rem(13)} />
        </button>
      </div>
      <div className="console-list" ref={list} role="log">
        {logs.length === 0 && <p className="console-empty">{t('console.empty')}</p>}
        {logs.map((log) => (
          <pre key={log.id} className={`log log-${log.level}`}>{log.text}</pre>
        ))}
      </div>
    </div>
  )
}
