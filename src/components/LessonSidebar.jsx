import { useMemo } from 'react'
import { Check, Lock, X } from 'lucide-react'
import { useI18n } from '../i18n/index.js'

export default function LessonSidebar({ open, trackName, lessons, activeId, completed, unlocked, onSelect, onClose }) {
  const { t } = useI18n()
  // Lessons grouped by stage, keeping their course index.
  const groups = useMemo(() => {
    const byGroup = new Map()
    lessons.forEach((lesson, index) => {
      if (!byGroup.has(lesson.group)) byGroup.set(lesson.group, [])
      byGroup.get(lesson.group).push({ lesson, index })
    })
    return [...byGroup]
  }, [lessons])

  return (
    <>
      {open && <button className="sidebar-scrim" type="button" onClick={onClose} aria-label={t('sidebar.close')} />}
      <aside className={open ? 'sidebar open' : 'sidebar'} inert={!open}>
        <div className="sidebar-heading">
          <h2>{t('sidebar.title', { course: trackName })}</h2>
          <button className="close-menu" type="button" onClick={onClose} aria-label={t('sidebar.close')}>
            <X />
          </button>
        </div>
        <nav aria-label={t('sidebar.nav', { course: trackName })}>
          {groups.map(([group, items]) => (
            <div className="lesson-group" key={group}>
              <p>{t(`stages.${group}`)}</p>
              {items.map(({ lesson, index }) => {
                const done = completed.has(lesson.id)
                const open = unlocked[index]
                const classes = [lesson.id === activeId && 'active', done && 'completed', !open && 'locked']
                return (
                  <button
                    className={classes.filter(Boolean).join(' ')}
                    type="button"
                    key={lesson.id}
                    onClick={() => onSelect(lesson.id)}
                    disabled={!open}
                    aria-current={lesson.id === activeId ? 'step' : undefined}
                    title={open ? lesson.title : t('sidebar.locked')}>
                    <span className="lesson-number">
                      {done ? <Check size={14} /> : open ? lesson.number : <Lock size={12} />}
                    </span>
                    <span>
                      <b>{lesson.title}</b>
                      <small>{lesson.topic}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
