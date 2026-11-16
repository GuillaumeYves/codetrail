import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Circle, Eye, Lightbulb, RotateCcw } from 'lucide-react'
import CodeEditor from './CodeEditor.jsx'
import Preview from './Preview.jsx'
import Console from './Console.jsx'
import useConsoleLogs from './useConsoleLogs.js'
import { protectLoops } from '../core/loopGuard.js'
import { codeSpans } from '../core/codeSpans.js'
import { useI18n } from '../i18n/index.js'
import htmlBaseCss from '../stacks/html/preview.css?raw'
import jsBaseCss from '../stacks/js/preview.css?raw'

const SAVE_DELAY = 300
const CHECK_DELAY = 350
const EDITOR_LANGUAGES = { '/styles.css': 'css', '/script.js': 'javascript' }

// Maps a lesson and the learner code to preview inputs.
function previewInput(lesson, code, script) {
  if (lesson.file === '/styles.css') {
    return { html: lesson.files['/index.html'], baseCss: lesson.files['/base.css'] ?? '', css: code }
  }
  if (lesson.file === '/script.js') return { html: lesson.files['/index.html'], baseCss: jsBaseCss, js: script }
  return { html: code, baseCss: htmlBaseCss, css: '' }
}

// Sync checks read a deferred copy of the code. Async ones (JavaScript) run after a pause
// and remember which code they checked, so completion never trusts stale results.
function useCheckResults(lesson, code, loopMessage) {
  const deferred = useDeferredValue(code)
  const syncPassed = useMemo(
    () => (lesson.evaluate ? null : lesson.checks.map((check) => check.test(deferred))),
    [lesson, deferred],
  )
  const [report, setReport] = useState(null)

  useEffect(() => {
    if (!lesson.evaluate) return undefined
    let active = true
    const timer = setTimeout(() => {
      lesson.evaluate(code, { loopMessage }).then((passed) => {
        if (active) setReport({ lesson, code, passed })
      })
    }, CHECK_DELAY)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [lesson, code, loopMessage])

  if (syncPassed) return { passed: syncPassed, current: true }
  const fresh = report?.lesson === lesson
  return { passed: fresh ? report.passed : lesson.checks.map(() => false), current: fresh && report.code === code }
}

function CodeText({ text }) {
  return codeSpans(text).map((part, index) => (part.code ? <code key={index}>{part.text}</code> : part.text))
}

function TaskBrief({ lesson, results }) {
  const { t } = useI18n()
  // Hints reveal one at a time, from a nudge to a near answer.
  const [shown, setShown] = useState(0)
  const latestHint = useRef(null)
  const hints = lesson.hints ?? []
  const passed = results.filter((result) => result.passed).length

  useEffect(() => {
    if (shown) latestHint.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [shown])

  return (
    <div className="objective-card">
      <div className="task-section">
        <span>{t('lesson.task')}</span>
        <p>{lesson.objective}</p>
      </div>
      <div className="task-section task-requirements">
        <div className="requirement-heading">
          <span>{t('lesson.requirements')}</span>
          <strong>{passed}/{results.length}</strong>
        </div>
        <ul className="requirement-list" aria-live="polite">
          {results.map((result, index) => (
            <li className={result.passed ? 'requirement-item passed' : 'requirement-item'} key={index}>
              {result.passed ? <Check size={15} /> : <Circle size={13} />}
              <span>
                <span className="sr-only">{t(result.passed ? 'lesson.passed' : 'lesson.pending')} </span>
                {result.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {hints.length > 0 && (
        <div className="task-section hint-section">
          {shown > 0 && (
            <ol className="hint-list" aria-label={t('lesson.hints')} aria-live="polite">
              {hints.slice(0, shown).map((hint, index) => (
                <li key={index} ref={index === shown - 1 ? latestHint : undefined}>
                  <span><CodeText text={hint} /></span>
                </li>
              ))}
            </ol>
          )}
          {shown < hints.length && (
            <button className="hint-button" type="button" onClick={() => setShown((value) => value + 1)}>
              <Lightbulb size={17} />
              {shown ? t('lesson.nextHint', { current: shown + 1, total: hints.length }) : t('lesson.showHint')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function LessonWorkspace({ lesson, savedCode, completed, trackName, onSave, onComplete, onNext, onRedo }) {
  const { t } = useI18n()
  const [code, setCode] = useState(savedCode ?? lesson.code)
  const loopMessage = t('editor.loopStopped')
  const checked = useCheckResults(lesson, code, loopMessage)
  const results = lesson.checks.map((check, index) => ({ label: check.label, passed: Boolean(checked.passed[index]) }))
  const resultsPass = results.every((result) => result.passed)
  const allPassed = checked.current && resultsPass
  const isScript = lesson.file === '/script.js'
  const script = useMemo(() => (isScript ? protectLoops(code, loopMessage) : ''), [isScript, code, loopMessage])
  const { logs, addLog, clearLogs } = useConsoleLogs()
  const pendingSave = useRef(null)

  // Debounced save, flushed when the lesson unmounts.
  useEffect(() => {
    pendingSave.current = () => onSave(lesson.id, code, lesson.code)
    const timer = setTimeout(() => {
      pendingSave.current?.()
      pendingSave.current = null
    }, SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [code, lesson, onSave])

  useEffect(() => () => pendingSave.current?.(), [])

  // Ctrl+Enter / Cmd+Enter completes or advances once every check passes.
  useEffect(() => {
    if (!allPassed) return undefined
    const onKey = (event) => {
      if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      event.stopPropagation()
      if (completed) onNext()
      else onComplete()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [allPassed, completed, onComplete, onNext])

  const fileName = (lesson.file ?? '/index.html').slice(1)
  const previewTitle = t('lesson.preview', { course: trackName })

  return (
    <div className="workspace">
      <section className="lesson-panel" aria-label={t('lesson.panel')}>
        <div className="lesson-scroll">
          <p className="eyebrow">{lesson.topic} · {lesson.number}</p>
          <h1>{lesson.title}</h1>
          <p className="lesson-summary">{lesson.summary}</p>

          <TaskBrief lesson={lesson} results={results} />

          <div className="lesson-guidance">
            {lesson.commonMistake && (
              <div className="common-mistake">
                <span>{t('lesson.mistake')}</span>
                <p>{lesson.commonMistake}</p>
              </div>
            )}
            {lesson.bestPractice && (
              <div className="best-practice-card">
                <span>{t('lesson.practice')}</span>
                <p>{lesson.bestPractice}</p>
              </div>
            )}
            {completed && lesson.solution && (
              <details className="solution-card">
                <summary>
                  <Eye size={15} /> {t('lesson.solution')}
                </summary>
                <p>{t('lesson.solutionNote')}</p>
                <pre><code>{lesson.solution.trim()}</code></pre>
              </details>
            )}
          </div>
        </div>

        <div className="lesson-action">
          {allPassed ? (
            <button
              className="complete-button"
              type="button"
              onClick={completed ? onNext : onComplete}
              title={t('lesson.shortcut')}>
              {t(completed ? 'lesson.next' : 'lesson.complete')}
              <ArrowRight size={18} />
              <kbd>Ctrl ↵</kbd>
            </button>
          ) : (
            <p>{t(resultsPass ? 'lesson.checking' : 'lesson.blocked')}</p>
          )}
        </div>
      </section>

      <section className="code-panel" aria-label={t('lesson.editorPanel')}>
        <div className="panel-bar">
          <div className="panel-title">
            <span className="status-dot" /> {fileName}
          </div>
          <button className="task-redo" type="button" onClick={onRedo} aria-label={t('lesson.redo')} title={t('lesson.redoTitle')}>
            <RotateCcw size={12} />
          </button>
        </div>
        <CodeEditor
          value={code}
          language={EDITOR_LANGUAGES[lesson.file] ?? 'html'}
          label={t('common.editorLabel', { file: fileName })}
          placeholder={t('editor.placeholder')}
          onChange={setCode}
        />
      </section>

      <section className={`preview-panel${lesson.consoleOnly ? ' console-only' : ''}`} aria-label={t('common.preview')}>
        <div className="panel-bar">
          <div className="panel-title">
            <span className="status-dot preview-dot" /> {previewTitle}
          </div>
          <span className="live-label">{t('common.live')}</span>
        </div>
        <Preview
          {...previewInput(lesson, code, script)}
          title={previewTitle}
          onLog={isScript ? addLog : undefined}
          onReload={isScript ? clearLogs : undefined}
        />
        {isScript && <Console logs={logs} onClear={clearLogs} />}
      </section>
    </div>
  )
}
