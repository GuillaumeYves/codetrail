// Playground starter files, local storage, and share links.

const STORAGE_KEY = 'codetrail-playground-v1'
const FILE_KEYS = ['html', 'css', 'js']

export const PLAYGROUND_TEMPLATE = Object.freeze({
  html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Playground</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main>
    <h1>Playground</h1>
    <p>Edit any file. The preview updates as you type.</p>
    <button id="greet" type="button">Say hello</button>
  </main>
  <script src="script.js"></script>
</body>
</html>
`,
  css: `body {
  margin: 2rem;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}

button {
  padding: 0.5rem 1rem;
  cursor: pointer;
}
`,
  js: `const button = document.querySelector('#greet')

button.addEventListener('click', () => {
  console.log('Hello from the playground!')
})
`,
})

const isFiles = (value) => Boolean(value) && FILE_KEYS.every((key) => typeof value[key] === 'string')
const pickFiles = (files) => Object.fromEntries(FILE_KEYS.map((key) => [key, files[key]]))

export function loadPlayground(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY))
    return isFiles(saved) ? pickFiles(saved) : { ...PLAYGROUND_TEMPLATE }
  } catch {
    return { ...PLAYGROUND_TEMPLATE }
  }
}

export function savePlayground(files, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(pickFiles(files)))
  } catch {
    // Storage full or blocked: the session still works.
  }
}

// Chunked so large files do not overflow the argument limit.
function toBase64Url(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0))

async function pipe(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// Deflate plus base64url keeps share links short and URL safe.
export async function encodeShare(files) {
  const json = JSON.stringify(pickFiles(files))
  return toBase64Url(await pipe(new TextEncoder().encode(json), new CompressionStream('deflate')))
}

export async function decodeShare(text) {
  const bytes = await pipe(fromBase64Url(text), new DecompressionStream('deflate'))
  const files = JSON.parse(new TextDecoder().decode(bytes))
  if (!isFiles(files)) throw new Error('Invalid share link')
  return pickFiles(files)
}
