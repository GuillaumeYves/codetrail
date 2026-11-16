import { useMemo } from 'react'
import { Check, Lock, X } from 'lucide-react'

export default function LessonSidebar({ open, trackName, lessons, activeId, completed, unlocked, onSelect, onClose }) {
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
      {open && <button className="sidebar-scrim" type="button" onClick={onClose} aria-label="Close lessons" />}
      <aside className={open ? 'sidebar open' : 'sidebar'} inert={!open}>
        <div className="sidebar-heading">
          <h2>{trackName} essentials course</h2>
          <button className="close-menu" type="button" onClick={onClose} aria-label="Close lessons">
            <X />
          </button>
        </div>
        <nav aria-label={`${trackName} lessons`}>
          {groups.map(([group, items]) => (
            <div className="lesson-group" key={group}>
              <p>{group}</p>
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
                    title={open ? lesson.title : 'Complete the previous lessons to unlock this challenge'}>
                    <span className="lesson-number">
                      {done ? <Check size={14} /> : open ? lesson.number : <Lock size={12} />}
                    </span>
                    <span>
                      <b>{lesson.title}</b>
                      <small>{lesson.eyebrow}</small>
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
