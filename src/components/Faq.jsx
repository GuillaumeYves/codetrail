import { useEffect, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { version } from '../../package.json'

const faqItems = [
  {
    question: 'How do the challenges work?',
    answer: 'Read the task, edit the file, and watch the preview update. Requirements are checked as you type. When all of them pass, complete the challenge and compare your code with the reference solution.',
  },
  {
    question: 'What is the playground for?',
    answer: 'The playground is a free HTML, CSS, and JavaScript sandbox with a console. Use it to test an idea outside a lesson. The Share button copies a link that contains your code.',
  },
  {
    question: 'Is my code sent anywhere?',
    answer: 'No. Lessons and the playground run entirely in your browser. The preview is a sandboxed frame with no access to the rest of the page. A shared playground link holds the code inside the URL itself.',
  },
  {
    question: 'Where is my progress saved?',
    answer: 'In this browser\'s local storage. Clearing site data or switching browsers or devices starts fresh.',
  },
  {
    question: 'Can I reset a challenge?',
    answer: 'The redo button above the editor restores the current task\'s starter code and keeps it completed. The red reset button in the top bar clears all progress and saved code.',
  },
  {
    question: 'Are there keyboard shortcuts?',
    answer: 'Ctrl+Enter (Cmd+Enter on Mac) completes the challenge or opens the next one once every requirement passes. In the editor, Tab indents; press Escape first to move focus out with Tab.',
  },
  {
    question: 'Which courses are included?',
    answer: 'HTML Essentials (50 lessons) and CSS Essentials (40 lessons). Each course unlocks lessons in order, from fundamentals to a capstone.',
  },
]

export default function Faq({ open, onToggle, onClose }) {
  const [expanded, setExpanded] = useState(0)

  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  return (
    <div className="faq-widget">
      {open && (
        <section className="faq-dialog" role="dialog" aria-labelledby="faq-title">
          <div className="faq-header">
            <div>
              <span>v{version}</span>
              <h2 id="faq-title">Frequently asked questions</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close frequently asked questions">
              <X size={18} />
            </button>
          </div>
          <div className="faq-list">
            {faqItems.map((item, index) => {
              const isExpanded = expanded === index
              return (
                <div className="faq-item" key={item.question}>
                  <button type="button" aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? -1 : index)}>
                    <span>{item.question}</span>
                    <ChevronDown className={isExpanded ? 'rotated' : ''} size={16} />
                  </button>
                  {isExpanded && <p>{item.answer}</p>}
                </div>
              )
            })}
          </div>
        </section>
      )}
      <button
        className="faq-trigger"
        type="button"
        onClick={onToggle}
        aria-label={open ? 'Close FAQ' : 'Open FAQ'}
        aria-expanded={open}>
        {open ? <X size={20} /> : '?'}
      </button>
    </div>
  )
}
