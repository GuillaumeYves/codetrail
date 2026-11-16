import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Eraser, Link2, RotateCcw } from 'lucide-react'
import CodeEditor from './CodeEditor.jsx'
import Preview from './Preview.jsx'
import { PLAYGROUND_TEMPLATE, decodeShare, encodeShare, loadPlayground, savePlayground } from '../core/playground.js'
import { useI18n } from '../i18n/index.js'

const FILES = [
  { id: 'html', name: 'index.html', language: 'html' },
  { id: 'css', name: 'styles.css', language: 'css' },
  { id: 'js', name: 'script.js', language: 'javascript' },
]
const MAX_LOGS = 200
const SAVE_DELAY = 300
const STATUS_TIME = 2500

const shareKeys = { copied: 'playground.copied', failed: 'playground.copyFailed' }

export default function Playground({ shared }) {
  const { t } = useI18n()
  const [files, setFiles] = useState(loadPlayground)
  const [activeFile, setActiveFile] = useState('html')
  const [revision, setRevision] = useState(0)
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const dirty = useRef(false)
  const latestFiles = useRef(files)
  const nextLogId = useRef(0)
  const consoleList = useRef(null)

  // Open code from a share link without overwriting saved work until it is edited.
  useEffect(() => {
    if (!shared) return undefined
    let live = true
    decodeShare(shared).then(
      (decoded) => {
        if (!live) return
        dirty.current = false
        setFiles(decoded)
        setRevision((value) => value + 1)
      },
      () => live && setStatus('invalid'),
    )
    return () => {
      live = false
    }
  }, [shared])

  useEffect(() => {
    latestFiles.current = files
    if (!dirty.current) return undefined
    const timer = setTimeout(() => savePlayground(files), SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [files])

  // Flush unsaved edits when leaving the playground.
  useEffect(() => () => {
    if (dirty.current) savePlayground(latestFiles.current)
  }, [])

  useEffect(() => {
    if (!status) return undefined
    const timer = setTimeout(() => setStatus(null), STATUS_TIME)
    return () => clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!confirmReset) return undefined
    const timer = setTimeout(() => setConfirmReset(false), STATUS_TIME)
    return () => clearTimeout(timer)
  }, [confirmReset])

  // Keep the newest console line in view.
  useEffect(() => {
    const list = consoleList.current
    if (list) list.scrollTop = list.scrollHeight
  }, [logs])

  const edit = (id) => (value) => {
    // First edit of shared code: drop the share hash so a reload keeps the edits.
    if (!dirty.current && shared) history.replaceState(null, '', '#/playground')
    dirty.current = true
    setFiles((current) => ({ ...current, [id]: value }))
  }

  const addLog = useCallback((entry) => {
    const item = { ...entry, id: ++nextLogId.current }
    setLogs((current) => [...current.slice(1 - MAX_LOGS), item])
  }, [])
  const clearLogs = useCallback(() => setLogs([]), [])

  const share = async () => {
    const url = `${location.href.split('#')[0]}#/playground/${await encodeShare(files)}`
    try {
      await navigator.clipboard.writeText(url)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
  }

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    setConfirmReset(false)
    dirty.current = true
    setFiles({ ...PLAYGROUND_TEMPLATE })
    setRevision((value) => value + 1)
  }

  const shareLabel = t(shareKeys[status] ?? 'playground.share')
  const resetLabel = t(confirmReset ? 'playground.confirmReset' : 'playground.reset')

  return (
    <div className="playground">
      <section className="code-panel" aria-label={t('playground.editorPanel')}>
        <div className="panel-bar">
          <div className="file-tabs" role="tablist" aria-label={t('playground.files')}>
            {FILES.map((file) => (
              <button
                key={file.id}
                id={`tab-${file.id}`}
                className={activeFile === file.id ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={activeFile === file.id}
                aria-controls={`panel-${file.id}`}
                onClick={() => setActiveFile(file.id)}>
                {file.name}
              </button>
            ))}
          </div>
          <div className="panel-actions">
            <button type="button" onClick={share} title={t('playground.shareTitle')} aria-label={shareLabel}>
              {status === 'copied' ? <Check size={13} /> : <Link2 size={13} />}
              <span>{shareLabel}</span>
            </button>
            <button
              className={confirmReset ? 'danger' : ''}
              type="button"
              onClick={reset}
              title={t('playground.resetTitle')}
              aria-label={resetLabel}>
              <RotateCcw size={13} />
              <span>{resetLabel}</span>
            </button>
          </div>
        </div>
        {status === 'invalid' && (
          <p className="playground-notice" role="status">{t('playground.invalidLink')}</p>
        )}
        {FILES.map((file) => (
          // Editors stay mounted so each file keeps its undo history.
          <div
            key={`${file.id}:${revision}`}
            id={`panel-${file.id}`}
            className="editor-slot"
            role="tabpanel"
            aria-labelledby={`tab-${file.id}`}
            hidden={activeFile !== file.id}>
            <CodeEditor
              value={files[file.id]}
              language={file.language}
              label={t('common.editorLabel', { file: file.name })}
              onChange={edit(file.id)}
            />
          </div>
        ))}
      </section>

      <section className="preview-panel" aria-label={t('playground.previewPanel')}>
        <div className="panel-bar">
          <div className="panel-title">
            <span className="status-dot preview-dot" /> {t('common.preview')}
          </div>
          <span className="live-label">{t('common.live')}</span>
        </div>
        <Preview
          key={revision}
          html={files.html}
          css={files.css}
          js={files.js}
          delay={400}
          title={t('playground.previewPanel')}
          onLog={addLog}
          onReload={clearLogs}
        />
        <div className="console">
          <div className="console-bar">
            <span>
              {t('playground.console')} {logs.length > 0 && <b>{logs.length}</b>}
            </span>
            <button type="button" onClick={clearLogs} aria-label={t('playground.clearConsole')} title={t('playground.clearConsole')}>
              <Eraser size={13} />
            </button>
          </div>
          <div className="console-list" ref={consoleList} role="log">
            {logs.length === 0 && <p className="console-empty">{t('playground.consoleEmpty')}</p>}
            {logs.map((log) => (
              <pre key={log.id} className={`log log-${log.level}`}>{log.text}</pre>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
