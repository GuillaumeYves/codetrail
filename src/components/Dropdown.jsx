import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { rem } from './rem.js'

// Single choice menu shared by the course and language pickers.
// groups: [{ id, title, options: [{ id, name, description, icon, lang }] }]
export default function Dropdown({ className, buttonClass, label, title, menuLabel, groups, value, onSelect, children }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const button = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined

    const closeOnOutside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }

    document.addEventListener('pointerdown', closeOnOutside)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  // Focus goes back to the trigger since the menu turns inert once closed.
  const choose = (id) => {
    setOpen(false)
    button.current?.focus()
    onSelect(id)
  }

  return (
    <div className={`dropdown ${className}`} ref={root}>
      <button
        className={buttonClass}
        ref={button}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        title={title}>
        {children}
        <ChevronDown className={open ? 'dropdown-chevron rotated' : 'dropdown-chevron'} size={rem(15)} aria-hidden="true" />
      </button>

      {/* Always mounted so it can fade out as well as in. */}
      <div className={open ? 'dropdown-menu open' : 'dropdown-menu'} id={menuId} role="listbox" aria-label={menuLabel} inert={!open}>
        {groups.map((group) => (
          <section className="dropdown-group" key={group.id}>
            {group.title && <p>{group.title}</p>}
            <div className="dropdown-options">
              {group.options.map((option) => {
                const selected = option.id === value
                return (
                  <button
                    className={selected ? 'dropdown-option active' : 'dropdown-option'}
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => choose(option.id)}>
                    {option.icon}
                    <span className="dropdown-option-copy">
                      <strong lang={option.lang}>{option.name}</strong>
                      {option.description && <small>{option.description}</small>}
                    </span>
                    {selected && <Check className="dropdown-check" size={rem(15)} aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
