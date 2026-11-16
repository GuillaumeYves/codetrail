import { Suspense, lazy, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { BookOpen, FlaskConical, Menu, PanelLeftClose, PanelLeftOpen, RotateCcw } from 'lucide-react'
import StackPicker from './components/StackPicker.jsx'
import LessonSidebar from './components/LessonSidebar.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import Faq from './components/Faq.jsx'
import { loadStack, stackIds, stacks } from './stacks/registry.js'
import {
  completeLesson,
  firstAvailableLessonId,
  loadProgress,
  redoLessonProgress,
  resetAllProgress,
  saveProgress,
  unlockedFlags,
  withLessonCode,
} from './core/progress.js'

// The editor bundle starts downloading right away, in parallel with lesson data.
const workspaceModule = import('./components/LessonWorkspace.jsx')
const LessonWorkspace = lazy(() => workspaceModule)
const Playground = lazy(() => import('./components/Playground.jsx'))

const EMPTY_LESSONS = []
const PLAYGROUND_ROUTE = /^#\/playground(?:\/(.+))?$/

// Hash routing works on GitHub Pages without server rewrites.
const subscribeToHash = (callback) => {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}
const readHash = () => window.location.hash

function navigate(hash) {
  if (hash) {
    window.location.hash = hash
    return
  }
  history.pushState(null, '', window.location.pathname + window.location.search)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

const PanelFallback = () => <div className="panel-loading">Loading editor</div>

function LoadingState({ trackName, error, onRetry }) {
  return (
    <div className="loading-state">
      <section>
        <span>{error ? 'LOAD ERROR' : 'LOADING COURSE'}</span>
        <h1>{error ? `Unable to load the ${trackName} course.` : `Preparing ${trackName}`}</h1>
        <p>{error ?? `The ${trackName} lessons and requirements are being loaded.`}</p>
        {error && (
          <button className="retry-button" type="button" onClick={onRetry}>
            Try again
          </button>
        )}
      </section>
    </div>
  )
}

export default function App() {
  const hash = useSyncExternalStore(subscribeToHash, readHash, () => '')
  const playgroundMatch = hash.match(PLAYGROUND_ROUTE)
  const inPlayground = Boolean(playgroundMatch)

  const [progress, setProgress] = useState(() => loadProgress(stackIds))
  const [tracks, setTracks] = useState({})
  const [loadErrors, setLoadErrors] = useState({})
  const [retryCount, setRetryCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
  const [resetType, setResetType] = useState(null)
  const [revision, setRevision] = useState(0)

  const stackId = progress.lastLanguage
  const trackName = stacks[stackId].name
  const lessons = tracks[stackId]?.lessons ?? EMPTY_LESSONS
  const completed = useMemo(() => new Set(progress.completed), [progress.completed])
  const unlocked = useMemo(() => unlockedFlags(lessons, completed), [lessons, completed])

  // Saved lesson when still unlocked, otherwise the first one left to do.
  const lessonIndex = useMemo(() => {
    const saved = lessons.findIndex((item) => item.id === progress.lastLesson[stackId])
    if (saved >= 0 && unlocked[saved]) return saved
    const firstId = firstAvailableLessonId(lessons, completed)
    return lessons.findIndex((item) => item.id === firstId)
  }, [lessons, unlocked, completed, progress.lastLesson, stackId])

  const lesson = lessons[lessonIndex] ?? null
  const completedCount = lessons.filter((item) => completed.has(item.id)).length
  const percentage = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0

  // Every course loads in parallel; results are cached by the registry.
  useEffect(() => {
    let live = true
    for (const id of stackIds) {
      loadStack(id).then(
        (loaded) => {
          if (!live) return
          setTracks((current) => (current[id] === loaded ? current : { ...current, [id]: loaded }))
          setLoadErrors((current) => (current[id] ? { ...current, [id]: null } : current))
        },
        (error) => live && setLoadErrors((current) => ({ ...current, [id]: error.message })),
      )
    }
    return () => {
      live = false
    }
  }, [retryCount])

  useEffect(() => saveProgress(progress), [progress])

  useEffect(() => {
    document.title = inPlayground ? 'Playground · CodeTrail' : lesson ? `${lesson.title} · CodeTrail` : 'CodeTrail'
  }, [inPlayground, lesson])

  useEffect(() => {
    if (!sidebarOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [sidebarOpen])

  const selectLesson = (id) => {
    const index = lessons.findIndex((item) => item.id === id)
    if (index < 0 || !unlocked[index]) return
    setProgress((current) => ({ ...current, lastLesson: { ...current.lastLesson, [stackId]: id } }))
    setSidebarOpen(false)
  }

  const selectStack = (id) => {
    if (inPlayground) navigate('')
    setSidebarOpen(false)
    setFaqOpen(false)
    if (id !== stackId) setProgress((current) => ({ ...current, lastLanguage: id }))
  }

  // Stable so the workspace save effect does not rerun on every render.
  const saveCode = useCallback((id, code, starter) => {
    setProgress((current) => withLessonCode(current, id, code === starter ? undefined : code))
  }, [])

  // Pins the lesson too, so a derived "first unfinished" lesson does not jump ahead.
  const finishLesson = () => {
    if (!lesson) return
    setProgress((current) => ({
      ...completeLesson(current, lesson.id),
      lastLesson: { ...current.lastLesson, [stackId]: lesson.id },
    }))
  }

  const nextLesson = () => {
    if (lessons.length) selectLesson(lessons[(lessonIndex + 1) % lessons.length].id)
  }

  const requestReset = (type) => {
    setFaqOpen(false)
    setSidebarOpen(false)
    setResetType(type)
  }

  const cancelReset = useCallback(() => setResetType(null), [])

  const confirmReset = () => {
    if (resetType === 'all') setProgress(resetAllProgress)
    else if (lesson) setProgress((current) => redoLessonProgress(current, lesson.id))
    setRevision((value) => value + 1)
    setResetType(null)
  }

  const retryLoad = () => {
    setLoadErrors((current) => ({ ...current, [stackId]: null }))
    setRetryCount((value) => value + 1)
  }

  const sidebarLabel = sidebarOpen ? 'Hide course lessons' : 'Show course lessons'

  return (
    <div className="app-shell">
      <header className="topbar">
        {!inPlayground && (
          <button className="mobile-menu" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open lessons">
            <Menu />
          </button>
        )}
        <div className="brand-cell">
          <StackPicker
            activeStackId={stackId}
            subtitle={inPlayground ? 'Playground' : undefined}
            onSelect={selectStack}
          />
          {!inPlayground && (
            <button
              className="desktop-sidebar-toggle"
              type="button"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label={sidebarLabel}
              title={sidebarLabel}>
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
          )}
        </div>

        <div className="top-progress">
          {inPlayground ? (
            <span>HTML, CSS, and JavaScript sandbox</span>
          ) : (
            <>
              <span>{lesson ? `${completedCount} of ${lessons.length} complete` : `Loading ${trackName} lessons`}</span>
              <div className="progress-track" role="progressbar" aria-label={`${trackName} progress`} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: `${percentage}%` }} />
              </div>
              <strong>{lesson ? `${percentage}%` : '...'}</strong>
            </>
          )}
        </div>

        <div className="top-actions">
          <button
            className={inPlayground ? 'mode-button active' : 'mode-button'}
            type="button"
            onClick={() => navigate(inPlayground ? '' : '#/playground')}
            title={inPlayground ? 'Back to the courses' : 'Open the free code playground'}>
            {inPlayground ? <BookOpen size={16} /> : <FlaskConical size={16} />}
            <span>{inPlayground ? 'Courses' : 'Playground'}</span>
          </button>
          {!inPlayground && (
            <button
              className="nav-reset"
              type="button"
              onClick={() => requestReset('all')}
              aria-label="Reset all progress"
              title="Reset all progress and saved code">
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="body-grid">
        {!inPlayground && lesson && (
          <LessonSidebar
            open={sidebarOpen}
            trackName={trackName}
            lessons={lessons}
            activeId={lesson.id}
            completed={completed}
            unlocked={unlocked}
            onSelect={selectLesson}
            onClose={() => setSidebarOpen(false)}
          />
        )}
        <main className="main-area">
          <Suspense fallback={<PanelFallback />}>
            {inPlayground ? (
              <Playground shared={playgroundMatch[1]} />
            ) : lesson ? (
              <LessonWorkspace
                key={`${lesson.id}:${revision}`}
                lesson={lesson}
                savedCode={progress.code[lesson.id]}
                completed={completed.has(lesson.id)}
                trackName={trackName}
                onSave={saveCode}
                onComplete={finishLesson}
                onNext={nextLesson}
                onRedo={() => requestReset('redo')}
              />
            ) : (
              <LoadingState trackName={trackName} error={loadErrors[stackId]} onRetry={retryLoad} />
            )}
          </Suspense>
        </main>
      </div>

      {resetType && (
        <ConfirmDialog
          type={resetType}
          lessonTitle={lesson?.title ?? 'current lesson'}
          trackName={trackName}
          onCancel={cancelReset}
          onConfirm={confirmReset}
        />
      )}
      <Faq open={faqOpen} onToggle={() => setFaqOpen((value) => !value)} onClose={() => setFaqOpen(false)} />
    </div>
  )
}
