// Splits lesson text into plain and code parts. `code` is a span; ``a `b` c`` holds backticks.
const CODE_SPAN = /(``.+?``|`[^`]+`)/

export function codeSpans(text) {
  return text.split(CODE_SPAN).map((part, index) => {
    if (index % 2 === 0) return { code: false, text: part }
    return { code: true, text: part.startsWith('``') ? part.slice(2, -2).trim() : part.slice(1, -1) }
  })
}
