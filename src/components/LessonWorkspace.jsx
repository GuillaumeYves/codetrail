import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Circle, Eye, Lightbulb, RotateCcw } from 'lucide-react'
import CodeEditor from './CodeEditor.jsx'
import Preview from './Preview.jsx'
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
  const [showHint, setShowHint] = useState(false)
  const hint = useRef(null)
  const passed = results.filter((result) => result.passed).length

  useEffect(() => {
    if (showHint) hint.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [showHint])

  return (
    <div className="objective-card">
      <div className="task-section">
        <span>WHAT TO DO</span>
        <p>{lesson.objective}</p>
      </div>
      <div className="task-section task-requirements">
        <div className="requirement-heading">
          <span>YOUR CODE MUST</span>
          <strong>{passed}/{results.length}</strong>
        </div>
        <ul className="requirement-list" aria-live="polite">
          {results.map((result) => (
            <li className={result.passed ? 'requirement-item passed' : 'requirement-item'} key={result.label}>
              {result.passed ? <Check size={15} /> : <Circle size={13} />}
              <span>
                <span className="sr-only">{result.passed ? 'Passed: ' : 'Pending: '}</span>
                {result.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="task-section hint-section">
        <button className="hint-button" type="button" aria-expanded={showHint} onClick={() => setShowHint((value) => !value)}>
          <Lightbulb size={17} />
          {showHint ? 'Hide hint' : 'Need a hint?'}
        </button>
        {showHint && <p className="hint-copy" ref={hint}>{lesson.hint}</p>}
      </div>
    </div>
  )
}

export default function LessonWorkspace({ lesson, savedCode, completed, trackName, onSave, onComplete, onNext, onRedo }) {
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

  return (
    <div className="workspace">
      <section className="lesson-panel" aria-label="Lesson">
        <div className="lesson-scroll">
          <p className="eyebrow">{lesson.eyebrow} · {lesson.number}</p>
          <h1>{lesson.title}</h1>
          <p className="lesson-summary">{lesson.summary}</p>

          <TaskBrief lesson={lesson} results={results} />

          <div className="lesson-guidance">
            {lesson.commonMistake && (
              <div className="common-mistake">
                <span>COMMON MISTAKE</span>
                <p>{lesson.commonMistake}</p>
              </div>
            )}
            {lesson.bestPractice && (
              <div className="best-practice-card">
                <span>GOOD PRACTICE</span>
                <p>{lesson.bestPractice}</p>
              </div>
            )}
            {completed && lesson.solution && (
              <details className="solution-card">
                <summary>
                  <Eye size={15} /> Compare with the reference solution
                </summary>
                <p>One clean way to solve it. Yours can differ and still be right.</p>
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
              title="Shortcut: Ctrl+Enter (Cmd+Enter on Mac)">
              {completed ? 'Next challenge' : 'Complete challenge'}
              <ArrowRight size={18} />
              <kbd>Ctrl ↵</kbd>
            </button>
          ) : (
            <p>Complete every requirement to continue</p>
          )}
        </div>
      </section>

      <section className="code-panel" aria-label="Editor">
        <div className="panel-bar">
          <div className="panel-title">
            <span className="status-dot" /> {fileName}
          </div>
          <button className="task-redo" type="button" onClick={onRedo} aria-label="Redo this task" title="Restore this task's starter code">
            <RotateCcw size={12} />
          </button>
        </div>
        <CodeEditor
          value={code}
          language={lesson.file === '/styles.css' ? 'css' : 'html'}
          label={`${fileName} editor`}
          onChange={setCode}
        />
      </section>

      <section className="preview-panel" aria-label="Preview">
        <div className="panel-bar">
          <div className="panel-title">
            <span className="status-dot preview-dot" /> {trackName} preview
          </div>
          <span className="live-label">LIVE</span>
        </div>
        <Preview {...previewInput(lesson, code)} title={`${trackName} preview`} />
      </section>
    </div>
  )
}
