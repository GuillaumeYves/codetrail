import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderText,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { HighlightStyle, bracketMatching, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { tags as t } from '@lezer/highlight'

const languages = { html, css, javascript }

const theme = EditorView.theme({
  '&': { height: '100%', color: '#e6edf3', backgroundColor: '#0d1117', fontSize: '14px' },
  '.cm-scroller': { fontFamily: '"JetBrains Mono", Consolas, monospace', lineHeight: '1.65' },
  '.cm-content': { padding: '12px 0', caretColor: '#58a6ff' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#58a6ff' },
  '&.cm-focused': { outline: 'none' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#264f78',
  },
  '.cm-gutters': { backgroundColor: '#0d1117', color: '#484f58', border: 'none' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 16px' },
  '.cm-activeLine': { backgroundColor: 'rgba(22, 27, 34, .7)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#8b949e' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(63, 185, 80, .18)', outline: '1px solid rgba(63, 185, 80, .4)' },
  '.cm-tooltip': { border: '1px solid #30363d', backgroundColor: '#161b22', color: '#e6edf3' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#1f6feb', color: '#fff' },
}, { dark: true })

const highlight = HighlightStyle.define([
  { tag: t.comment, color: '#8b949e', fontStyle: 'italic' },
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: '#ff7b72' },
  { tag: [t.tagName, t.angleBracket], color: '#7ee787' },
  { tag: [t.attributeName, t.propertyName], color: '#79c0ff' },
  { tag: [t.string, t.attributeValue, t.special(t.string)], color: '#a5d6ff' },
  { tag: [t.number, t.bool, t.null, t.atom, t.unit, t.color], color: '#ffa657' },
  { tag: [t.className, t.definition(t.variableName), t.function(t.variableName)], color: '#d2a8ff' },
  { tag: [t.punctuation, t.bracket, t.separator], color: '#c9d1d9' },
  { tag: t.invalid, color: '#f85149' },
])

// Shared by every editor instance.
const baseExtensions = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightActiveLine(),
  drawSelection(),
  history(),
  indentOnInput(),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  EditorView.lineWrapping,
  syntaxHighlighting(highlight),
  theme,
  keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...completionKeymap, indentWithTab]),
]

// Uncontrolled CodeMirror editor. Change its key to load a different document.
export default function CodeEditor({ value, language = 'html', label, placeholder, onChange }) {
  const host = useRef(null)
  // Latest text, so a rebuild (new language or label) keeps the learner's edits.
  const doc = useRef(value)
  const latestOnChange = useRef(onChange)

  useEffect(() => {
    latestOnChange.current = onChange
  })

  useEffect(() => {
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: doc.current,
        extensions: [
          baseExtensions,
          languages[language](),
          EditorView.contentAttributes.of({ 'aria-label': label }),
          placeholder ? placeholderText(placeholder) : [],
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return
            doc.current = update.state.doc.toString()
            latestOnChange.current?.(doc.current)
          }),
        ],
      }),
    })
    return () => view.destroy()
  }, [language, label, placeholder])

  return <div className="code-editor" ref={host} />
}
