import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Circle, Eye, Lightbulb, RotateCcw } from 'lucide-react'
import CodeEditor from './CodeEditor.jsx'
import Preview from './Preview.jsx'
import { useI18n } from '../i18n/index.js'
import htmlBaseCss from '../stacks/html/preview.css?raw'

const SAVE_DELAY = 300

// Maps a lesson and the learner code to preview inputs.
function previewInput(lesson, code) {
  if (lesson.file === '/styles.css') {
    return { html: lesson.files['/index.html'], baseCss: lesson.files['/base.css'] ?? '', css: code }
  }
  return { html: code, baseCss: htmlBaseCss, css: '' }
}

function TaskBrief({ lesson, results }) {
  const { t } = useI18n()
  const [showHint, setShowHint] = useState(false)
  const hint = useRef(null)
  const passed = results.filter((result) => result.passed).length

  useEffect(() => {
    if (showHint) hint.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [showHint])

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
      <div className="task-section hint-section">
        <button className="hint-button" type="button" aria-expanded={showHint} onClick={() => setShowHint((value) => !value)}>
          <Lightbulb size={17} />
          {t(showHint ? 'lesson.hideHint' : 'lesson.showHint')}
        </button>
        {showHint && <p className="hint-copy" ref={hint}>{lesson.hint}</p>}
      </div>
    </div>
  )
}

export default function LessonWorkspace({ lesson, savedCode, completed, trackName, onSave, onComplete, onNext, onRedo }) {
  const { t } = useI18n()
  const [code, setCode] = useState(savedCode ?? lesson.code)
  // Checks run on a deferred copy so typing never waits on them.
  const checkedCode = useDeferredValue(code)
  const results = useMemo(
    () => lesson.checks.map((check) => ({ label: check.label, passed: check.test(checkedCode) })),
    [lesson, checkedCode],
  )
  const allPassed = results.every((result) => result.passed)
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
            <p>{t('lesson.blocked')}</p>
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
          language={lesson.file === '/styles.css' ? 'css' : 'html'}
          label={t('common.editorLabel', { file: fileName })}
          onChange={setCode}
        />
      </section>

      <section className="preview-panel" aria-label={t('common.preview')}>
        <div className="panel-bar">
          <div className="panel-title">
            <span className="status-dot preview-dot" /> {previewTitle}
          </div>
          <span className="live-label">{t('common.live')}</span>
        </div>
        <Preview {...previewInput(lesson, code)} title={previewTitle} />
      </section>
    </div>
  )
}
