import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import cssIcon from 'devicon/icons/css3/css3-original.svg'
import htmlIcon from 'devicon/icons/html5/html5-original.svg'
import { stackIds, stacks } from '../stacks/registry.js'
import { useI18n } from '../i18n/index.js'

const stackIcons = { html: htmlIcon, css: cssIcon }

// Stacks grouped by activity id (translated as activities.<id>) for the picker menu.
const stackGroups = stackIds.reduce((groups, id) => {
  const activity = stacks[id].activity ?? 'web'
  const group = groups.find((item) => item.activity === activity)
  if (group) group.ids.push(id)
  else groups.push({ activity, ids: [id] })
  return groups
}, [])

function StackLogo({ stackId }) {
  return (
    <span className={`language-logo-frame active-icon ${stackId}-frame`}>
      <img className="language-logo" src={stackIcons[stackId] ?? htmlIcon} alt="" aria-hidden="true" />
    </span>
  )
}

export default function StackPicker({ activeStackId, subtitle, onSelect }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const picker = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const closeOnOutside = (event) => {
      if (!picker.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutside)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const choose = (id) => {
    setOpen(false)
    onSelect(id)
  }

  return (
    <div className="language-selector" ref={picker}>
      <button
        className="brand"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="stack-picker-menu"
        aria-label={t('picker.label')}>
        <StackLogo stackId={activeStackId} />
        <span className="brand-copy">
          <b>CodeTrail</b>
          <span className="brand-stack-name">{subtitle ?? stacks[activeStackId]?.name}</span>
        </span>
        <ChevronDown className={`stack-picker-chevron ${open ? 'rotated' : ''}`} size={15} aria-hidden="true" />
      </button>

      {open && (
        <div className="stack-menu" id="stack-picker-menu" role="listbox" aria-label={t('picker.menu')}>
          {stackGroups.map((group) => (
            <section className="stack-menu-group" key={group.activity}>
              <p>{t(`activities.${group.activity}`)}</p>
              <div className="stack-menu-options">
                {group.ids.map((id) => {
                  const selected = id === activeStackId
                  return (
                    <button
                      className={`stack-option ${selected ? 'active' : ''}`}
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => choose(id)}>
                      <StackLogo stackId={id} />
                      <span className="stack-option-copy">
                        <strong>{stacks[id].name}</strong>
                        <small>{t(`stacks.${id}.description`)}</small>
                      </span>
                      {selected && <Check className="stack-option-check" size={15} aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
