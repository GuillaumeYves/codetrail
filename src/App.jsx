import { Suspense, lazy, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { BookOpen, FlaskConical, Menu, PanelLeftClose, PanelLeftOpen, RotateCcw } from 'lucide-react'
import StackPicker from './components/StackPicker.jsx'
import LessonSidebar from './components/LessonSidebar.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import Faq from './components/Faq.jsx'
import LanguageSelect from './components/LanguageSelect.jsx'
import { rem } from './components/rem.js'
import { useI18n } from './i18n/index.js'
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

function PanelFallback() {
  const { t } = useI18n()
  return <div className="panel-loading">{t('app.loadingEditor')}</div>
}

function LoadingState({ trackName, error, onRetry }) {
  const { t } = useI18n()
  const course = { course: trackName }
  return (
    <div className="loading-state">
      <section>
        <span>{t(error ? 'loading.errorLabel' : 'loading.label')}</span>
        <h1>{t(error ? 'loading.errorTitle' : 'loading.title', course)}</h1>
        <p>{error ?? t('loading.text', course)}</p>
        {error && (
          <button className="retry-button" type="button" onClick={onRetry}>
            {t('loading.retry')}
          </button>
        )}
      </section>
    </div>
  )
}

export default function App() {
  const { t, locale } = useI18n()
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

  // Every course loads in parallel and reloads its text when the language changes.
  // The previous language stays on screen until the new text arrives.
  useEffect(() => {
    let live = true
    for (const id of stackIds) {
      loadStack(id, locale).then(
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
  }, [retryCount, locale])

  useEffect(() => saveProgress(progress), [progress])

  useEffect(() => {
    document.title = inPlayground
      ? t('app.playgroundTitle')
      : lesson ? t('app.lessonTitle', { title: lesson.title }) : t('app.title')
  }, [inPlayground, lesson, t])

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

  const sidebarLabel = t(sidebarOpen ? 'topbar.hideLessons' : 'topbar.showLessons')

  return (
    <div className="app-shell">
      <header className="topbar">
        {!inPlayground && (
          <button className="mobile-menu" type="button" onClick={() => setSidebarOpen(true)} aria-label={t('topbar.openLessons')}>
            <Menu size={rem(20)} />
          </button>
        )}
        <div className="brand-cell">
          <StackPicker
            activeStackId={stackId}
            subtitle={inPlayground ? t('topbar.playgroundSubtitle') : undefined}
            onSelect={selectStack}
          />
          {!inPlayground && (
            <button
              className="desktop-sidebar-toggle"
              type="button"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label={sidebarLabel}
              title={sidebarLabel}>
              {sidebarOpen ? <PanelLeftClose size={rem(18)} /> : <PanelLeftOpen size={rem(18)} />}
            </button>
          )}
        </div>

        <div className="top-progress">
          {inPlayground ? (
            <span>{t('topbar.playgroundInfo')}</span>
          ) : (
            <>
              <span>
                {lesson
                  ? t('topbar.progress', { done: completedCount, total: lessons.length })
                  : t('topbar.loadingLessons', { course: trackName })}
              </span>
              <div
                className="progress-track"
                role="progressbar"
                aria-label={t('topbar.progressLabel', { course: trackName })}
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}>
                <i style={{ width: `${percentage}%` }} />
              </div>
              <strong>{lesson ? `${percentage}%` : '...'}</strong>
            </>
          )}
        </div>

        <div className="top-actions">
          <LanguageSelect />
          <button
            className={inPlayground ? 'mode-button active' : 'mode-button'}
            type="button"
            onClick={() => navigate(inPlayground ? '' : '#/playground')}
            title={t(inPlayground ? 'topbar.coursesTitle' : 'topbar.playgroundTitle')}>
            {inPlayground ? <BookOpen size={rem(16)} /> : <FlaskConical size={rem(16)} />}
            <span>{t(inPlayground ? 'topbar.courses' : 'topbar.playground')}</span>
          </button>
          {!inPlayground && (
            <button
              className="nav-reset"
              type="button"
              onClick={() => requestReset('all')}
              aria-label={t('topbar.resetAll')}
              title={t('topbar.resetAllTitle')}>
              <RotateCcw size={rem(16)} />
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
          lessonTitle={lesson?.title ?? t('confirm.currentLesson')}
          trackName={trackName}
          onCancel={cancelReset}
          onConfirm={confirmReset}
        />
      )}
      <Faq open={faqOpen} onToggle={() => setFaqOpen((value) => !value)} onClose={() => setFaqOpen(false)} />
    </div>
  )
}
