import test from 'node:test'
import assert from 'node:assert/strict'
import { loadAllStacks, loadStack } from '../src/stacks/registry.js'
import { htmlStackSource } from '../src/stacks/html/source.js'
import { cssStackSource } from '../src/stacks/css/source.js'

const stacks = await loadAllStacks()
const htmlTrack = await loadStack('html')
const cssTrack = await loadStack('css')
const htmlLessons = htmlTrack.lessons
const cssLessons = cssTrack.lessons
const htmlSourceLessons = htmlStackSource.lessons
const cssSourceLessons = cssStackSource.lessons

const stages = ['Fundamental', 'Basic', 'Intermediate', 'Advanced']
const expectedStageSizes = { Fundamental: 13, Basic: 13, Intermediate: 12, Advanced: 12 }
const expectedCssStageSizes = { Fundamental: 10, Basic: 10, Intermediate: 10, Advanced: 10 }
const expectedStageAnchors = {
  Fundamental: ['html-semantic-paragraph', 'html-lang-meta'],
  Basic: ['html-page-regions', 'html-address'],
  Intermediate: ['html-form-label', 'html-video'],
  Advanced: ['html-picture', 'html-full-page'],
}
const progressionEdges = [
  ['html-semantic-paragraph', 'html-heading-paragraph'],
  ['html-heading-paragraph', 'html-page-regions'],
  ['html-page-regions', 'html-form-label'],
  ['html-form-label', 'html-skip-link'],
]

const assertProgressionMetadata = (trackLessons, stageSizes = expectedStageSizes) => {
  assert.deepEqual(trackLessons.map((lesson) => lesson.difficulty), trackLessons.map((_, index) => index + 1))

  for (const stage of stages) {
    const stageLessons = trackLessons.filter((lesson) => lesson.group === stage)
    assert.deepEqual(stageLessons.map((lesson) => lesson.stageStep), stageLessons.map((_, index) => index + 1))
    assert.equal(stageLessons.every((lesson) => lesson.stageSize === stageSizes[stage]), true)
  }
}

test('HTML and CSS tracks are available', () => {
  assert.deepEqual(Object.keys(stacks), ['html', 'css'])
})

test('HTML course has 50 staged beginner-to-advanced lessons', () => {
  assert.equal(htmlLessons.length, 50)
  assert.deepEqual([...new Set(htmlLessons.map((lesson) => lesson.group))], stages)
  assert.deepEqual(
    Object.fromEntries(stages.map((stage) => [stage, htmlLessons.filter((lesson) => lesson.group === stage).length])),
    expectedStageSizes,
  )
  assert.equal(htmlLessons.every((lesson) => lesson.commonMistake.length > 20), true)
  assert.equal(htmlLessons.every((lesson) => lesson.bestPractice.length > 20), true)
  assert.equal(htmlLessons.every((lesson) => lesson.file === '/index.html'), true)
  assertProgressionMetadata(htmlLessons)
})

test('HTML source keeps authoring guidance and canonical solutions', () => {
  assert.equal(htmlSourceLessons.length, 50)
  assert.equal(htmlSourceLessons.every((lesson) => lesson.notes.length >= 2), true)
  assert.equal(htmlSourceLessons.every((lesson) => lesson.learningSteps.length === 3), true)
  assert.equal(htmlSourceLessons.every((lesson) => lesson.learningSteps.every((step) => step.title && step.text.length > 20)), true)
  assert.equal(htmlSourceLessons.every((lesson) => lesson.solution.length > 20), true)
})

const authoringOnlyFields = ['concept', 'expectedResult', 'learningSteps', 'notes']

test('HTML runtime payload excludes authoring-only fields and ships the reference solution', () => {
  for (const lesson of htmlLessons) {
    assert.deepEqual(authoringOnlyFields.filter((field) => field in lesson), [])
    assert.equal(typeof lesson.solution, 'string')
  }
})

test('CSS course has 40 staged lessons with fixed HTML preview files', () => {
  assert.equal(cssLessons.length, 40)
  assert.deepEqual([...new Set(cssLessons.map((lesson) => lesson.group))], stages)
  assert.deepEqual(
    Object.fromEntries(stages.map((stage) => [stage, cssLessons.filter((lesson) => lesson.group === stage).length])),
    expectedCssStageSizes,
  )
  assert.equal(cssLessons.every((lesson) => lesson.file === '/styles.css'), true)
  assert.equal(cssLessons.every((lesson) => lesson.files?.['/index.html']?.includes('<link rel="stylesheet" href="/styles.css">')), true)
  assert.equal(cssLessons.every((lesson) => typeof lesson.files?.['/base.css'] === 'string'), true)
  assert.equal(cssLessons.some((lesson) => '/index.js' in lesson.files), false)
  const lessonById = (id) => cssLessons.find((lesson) => lesson.id === id)
  assert.equal(lessonById('css-border-color')?.files?.['/base.css']?.includes('border: 2px solid transparent;'), true)
  assert.equal(lessonById('css-radius')?.files?.['/base.css']?.includes('border: 1px solid #cbd5e1;'), true)
  assert.equal(lessonById('css-gap')?.files?.['/base.css']?.includes('display: flex;'), true)
  assert.equal(lessonById('css-grid-columns')?.files?.['/base.css']?.includes('display: grid;'), true)
  assert.equal(lessonById('css-media-card-grid')?.files?.['/base.css']?.includes('grid-template-columns: repeat(3, 1fr);'), true)
  assert.equal(lessonById('css-media-nav')?.files?.['/base.css']?.includes('display: flex;'), true)
  assert.equal(lessonById('css-transition')?.files?.['/base.css']?.includes('.cta-button:hover'), true)
  assert.equal(cssLessons.every((lesson) => lesson.commonMistake.length > 20), true)
  assert.equal(cssLessons.every((lesson) => lesson.bestPractice.length > 20), true)
  assertProgressionMetadata(cssLessons, expectedCssStageSizes)
})

test('CSS source keeps canonical solutions for regression checks', () => {
  assert.equal(cssSourceLessons.length, 40)
  assert.equal(cssSourceLessons.every((lesson) => lesson.solution.length > 20), true)
})

test('CSS runtime payload excludes authoring-only fields and keeps preview files', () => {
  for (const lesson of cssLessons) {
    assert.deepEqual(authoringOnlyFields.filter((field) => field in lesson), [])
    assert.equal(typeof lesson.solution, 'string')
    assert.equal(typeof lesson.files?.['/index.html'], 'string')
  }
})

test('Shipped solutions pass their own hydrated checks', () => {
  for (const lesson of [...htmlLessons, ...cssLessons]) {
    const failed = lesson.checks.filter((check) => !check.test(lesson.solution)).map((check) => check.label)
    assert.deepEqual(failed, [], lesson.id)
  }
})

test('HTML course starts with semantics before h1 headings', () => {
  assert.deepEqual(htmlLessons.slice(0, 4).map((lesson) => lesson.id), [
    'html-semantic-paragraph',
    'html-paired-tags',
    'html-nesting',
    'html-emphasis',
  ])
  assert.ok(
    htmlLessons.findIndex((lesson) => lesson.id === 'html-semantic-paragraph')
      < htmlLessons.findIndex((lesson) => lesson.id === 'html-heading-paragraph'),
  )
})

test('HTML lesson ids are unique', () => {
  const ids = htmlLessons.map((lesson) => lesson.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('HTML starter code does not prefill placeholder comments', () => {
  assert.equal(htmlLessons.every((lesson) => !/<!--[\s\S]*?-->/.test(lesson.code)), true)
})

test('HTML course keeps beginner concepts before advanced concepts', () => {
  const lessonsById = new Map(htmlLessons.map((lesson, index) => [lesson.id, { lesson, index }]))

  for (const [stage, ids] of Object.entries(expectedStageAnchors)) {
    for (const id of ids) {
      assert.equal(lessonsById.get(id)?.lesson.group, stage, `${id} should stay in ${stage}`)
    }
  }

  for (const [earlier, later] of progressionEdges) {
    assert.ok(lessonsById.get(earlier).index < lessonsById.get(later).index, `${earlier} should come before ${later}`)
  }
})

for (const lesson of htmlSourceLessons) {
  test(`HTML: canonical solution passes ${lesson.id}`, () => {
    const failed = lesson.checks.filter((check) => !check.test(lesson.solution)).map((check) => check.label)
    assert.deepEqual(failed, [])
  })

  test(`HTML: starter does not complete ${lesson.id}`, () => {
    assert.equal(lesson.checks.every((check) => check.test(lesson.code)), false)
  })
}

for (const lesson of cssSourceLessons) {
  test(`CSS: canonical solution passes ${lesson.id}`, () => {
    const failed = lesson.checks.filter((check) => !check.test(lesson.solution)).map((check) => check.label)
    assert.deepEqual(failed, [])
  })

  test(`CSS: starter does not complete ${lesson.id}`, () => {
    assert.equal(lesson.checks.every((check) => check.test(lesson.code)), false)
  })
}

const htmlPage = (body, head = '<title>CodeTrail</title>') => `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  ${head}
</head>
<body>
${body}
</body>
</html>`

const findHtmlLesson = (lessonId) => {
  const lesson = htmlLessons.find((item) => item.id === lessonId)
  assert.ok(lesson, `Missing HTML lesson ${lessonId}`)
  return lesson
}

const assertHtmlLessonPasses = (lessonId, code) => {
  const lesson = findHtmlLesson(lessonId)
  assert.deepEqual(lesson.checks.filter((check) => !check.test(code)).map((check) => check.label), [])
}

const assertHtmlLessonFails = (lessonId, code, expectedFailedLabel) => {
  const lesson = findHtmlLesson(lessonId)
  const failed = lesson.checks.filter((check) => !check.test(code)).map((check) => check.label)
  assert.ok(failed.includes(expectedFailedLabel), `${lessonId} should fail "${expectedFailedLabel}", got ${failed.join(', ')}`)
}

const findCssLesson = (lessonId) => {
  const lesson = cssLessons.find((item) => item.id === lessonId)
  assert.ok(lesson, `Missing CSS lesson ${lessonId}`)
  return lesson
}

const assertCssLessonPasses = (lessonId, code) => {
  const lesson = findCssLesson(lessonId)
  assert.deepEqual(lesson.checks.filter((check) => !check.test(code)).map((check) => check.label), [])
}

const assertCssLessonFails = (lessonId, code, expectedFailedLabel) => {
  const lesson = findCssLesson(lessonId)
  const failed = lesson.checks.filter((check) => !check.test(code)).map((check) => check.label)
  assert.ok(failed.includes(expectedFailedLabel), `${lessonId} should fail "${expectedFailedLabel}", got ${failed.join(', ')}`)
}

test('HTML checks accept personal wording when the semantic result is correct', () => {
  assertHtmlLessonPasses('html-semantic-paragraph', htmlPage('  <p>test</p>'))
  assertHtmlLessonPasses('html-semantic-paragraph', htmlPage('  <p>123</p>'))
  assertHtmlLessonPasses('html-paired-tags', htmlPage('  <p>x</p><p>y</p>'))
  assertHtmlLessonPasses('html-nesting', htmlPage('  <p>Ship the <strong>smallest useful</strong> page.</p>'))
  assertHtmlLessonPasses('html-emphasis', htmlPage('  <p>Read <em>before</em> you paste.</p>'))
  assertHtmlLessonPasses('html-heading-paragraph', htmlPage('  <h1>x</h1><p>y</p>'))
  assertHtmlLessonPasses('html-link', htmlPage('  <a href="https://developer.mozilla.org/">x</a>'))
  assertHtmlLessonPasses('html-details', htmlPage('  <details><summary>x</summary><p>y</p></details>'))
})

test('CSS checks accept flexible formatting and learner-chosen values', () => {
  assertCssLessonPasses('css-text-color', '.hero-title{color: rebeccapurple;}')
  assertCssLessonPasses('css-card-background', '.preview-card {\n  background-color: rgb(240, 248, 255);\n}')
  assertCssLessonPasses('css-grouped-selectors', '.card-title, .section-title { color: #334155; }')
  assertCssLessonPasses('css-border-color', '.featured-card { border-color: red; }')
  assertCssLessonPasses('css-padding', '.preview-card { padding: 24px; }')
  assertCssLessonPasses('css-radius', '.preview-card { border-radius: 12px; }')
  assertCssLessonPasses('css-gap', '.toolbar { gap: 12px; }')
  assertCssLessonPasses('css-justify-content', '.toolbar { justify-content: center; }')
  assertCssLessonPasses('css-grid-columns', '.card-grid { grid-template-columns: repeat(3, 1fr); }')
  assertCssLessonPasses('css-transition', '.cta-button { transition: background-color 180ms ease; }')
  assertCssLessonPasses('css-max-width', '.content-shell { margin: 3rem auto; max-width: 70rem; }')
  assertCssLessonPasses('css-hover-state', '.cta-button:hover { background-color: hsl(220 80% 50%); }')
})

test('CSS checks accept responsive and advanced syntax without exact file matches', () => {
  assertCssLessonPasses('css-media-card-grid', '@media screen and (max-width: 720px) { .card-grid { grid-template-columns: 1fr; } }')
  assertCssLessonPasses('css-media-nav', '@media (max-width: 44rem) { .nav-list { flex-direction: column; } }')
  assertCssLessonPasses('css-keyframes', '@keyframes pulse { from { opacity: .5; } to { opacity: 1; } } .badge { animation: pulse 900ms ease; }')
  assertCssLessonPasses('css-reduced-motion', '.badge { animation: pulse 1s infinite; } @media (prefers-reduced-motion: reduce) { .badge { animation: none; } }')
})

test('CSS checks reject wrong selectors or missing declarations', () => {
  assertCssLessonFails(
    'css-text-color',
    '.hero-title { color: red }',
    'Every CSS declaration ends with a semicolon',
  )
  assertCssLessonFails(
    'css-text-color',
    '.intro-copy { color: rebeccapurple; }',
    'Hero title has a color declaration',
  )
  assertCssLessonFails(
    'css-display-flex',
    '.toolbar { display: grid; }',
    'Toolbar uses flex layout',
  )
  assertCssLessonFails(
    'css-display-flex',
    '@media (max-width: 700px) { .toolbar { display: flex; } }',
    'Toolbar uses flex layout',
  )
  assertCssLessonFails(
    'css-media-card-grid',
    '.card-grid { grid-template-columns: 1fr; }',
    'Small-screen media query stacks the card grid',
  )
  assertCssLessonFails(
    'css-custom-property',
    '.cta-button { --accent: #2563eb; }',
    'Root defines an accent custom property',
  )
})

test('HTML checks accept arbitrary text for non-content-focused requirements', () => {
  assertHtmlLessonPasses('html-document-title', htmlPage('  <h1>x</h1>', '<title>My custom tab</title>'))
  assertHtmlLessonPasses('html-attributes', htmlPage('  <section id="hero" class="panel selected">x</section>'))
  assertHtmlLessonPasses('html-comments', htmlPage('  <!-- The main region starts here --><main>x</main>'))
  assertHtmlLessonPasses('html-entities', htmlPage('  <p>A &lt; B &amp; C</p>'))
  assertHtmlLessonPasses('html-image-alt', htmlPage('  <img src="photo.webp" alt="x">'))
  assertHtmlLessonPasses('html-address', htmlPage('  <address><a href="mailto:hello@example.com">x</a></address>'))
  assertHtmlLessonPasses('html-form-label', htmlPage('  <label for="nickname">x</label><input id="nickname" type="text">'))
  assertHtmlLessonPasses('html-audio', htmlPage('  <audio controls><source src="clip.mp3" type="audio/mpeg">x</audio>'))
  assertHtmlLessonPasses('html-picture', htmlPage('  <picture><source media="(min-width: 700px)" srcset="desktop.webp"><img src="mobile.jpg" alt="x"></picture>'))
  assertHtmlLessonPasses('html-safe-scripts', htmlPage('  <noscript>x</noscript>', '<title>App</title><script defer src="ui.js"></script><script src="entry.js" type="module"></script>'))
  assertHtmlLessonPasses('html-autocomplete', htmlPage('  <input name="full-name" autocomplete="name"><input type="email" name="contact-email" autocomplete="email">'))
})

test('HTML checks accept learner-chosen list, table, and metadata content', () => {
  assertHtmlLessonPasses('html-ordered-list', htmlPage('  <ol><li>Research</li><li>Draft</li><li>Review</li></ol>'))
  assertHtmlLessonPasses('html-description-list', htmlPage('  <dl><dt>API</dt><dd>Contract</dd><dt>UI</dt><dd>Interface</dd></dl>'))
  assertHtmlLessonPasses('html-time', htmlPage('  <time datetime="2026-12-31">Last day of 2026</time>'))
  assertHtmlLessonPasses('html-table', htmlPage('  <table><tr><th>City</th><th>Temp</th></tr><tr><td>Lyon</td><td>22</td></tr></table>'))
  assertHtmlLessonPasses('html-table-scope', htmlPage('  <table><caption>Forecast</caption><tr><th scope="col">Day</th><th scope="col">Rain</th></tr></table>'))
  assertHtmlLessonPasses('html-code-pre', htmlPage('  <pre><code>npm test</code></pre>'))
  assertHtmlLessonPasses('html-description-meta', htmlPage('  <h1>x</h1>', '<title>x</title><meta name="description" content="A concise page summary.">'))
  assertHtmlLessonPasses('html-canonical', htmlPage('  <h1>x</h1>', '<title>x</title><link rel="canonical" href="https://example.org/custom-page">'))
})

test('HTML checks accept dynamic relationships instead of fixed ids', () => {
  assertHtmlLessonPasses('html-textarea-select', htmlPage('  <label for="story">Story</label><textarea id="story" name="story" rows="4"></textarea><label for="track">Track</label><select id="track" name="track"><option>Frontend</option><option>Backend</option></select>'))
  assertHtmlLessonPasses('html-fieldsets', htmlPage('  <fieldset><legend>Theme</legend><label><input type="radio" name="theme" value="light">Light</label><label><input type="radio" name="theme" value="dark">Dark</label></fieldset>'))
  assertHtmlLessonPasses('html-checkbox', htmlPage('  <input id="privacy" type="checkbox" name="privacy" required><label for="privacy">Accept privacy policy</label>'))
  assertHtmlLessonPasses('html-skip-link', htmlPage('  <a href="#article">Skip</a><header>Nav</header><main id="article">Main</main>'))
  assertHtmlLessonPasses('html-aria-expanded', htmlPage('  <button type="button" aria-expanded="false" aria-controls="drawer">Open</button><div id="drawer">Links</div>'))
  assertHtmlLessonPasses('html-progress-meter', htmlPage('  <progress value="4" max="10">4 of 10</progress><meter min="1" max="5" value="3">3</meter>'))
})

test('HTML checks ignore safe attribute order differences', () => {
  assertHtmlLessonPasses('html-input-types', htmlPage('  <form><input required name="email" type="email"><input required name="password" type="password"></form>'))
  assertHtmlLessonPasses('html-form-submit', htmlPage('  <form method="post" action="/signup"><input name="email" type="email"><button type="submit">Join</button></form>'))
  assertHtmlLessonPasses('html-validation', htmlPage('  <input pattern="[A-Za-z]+" maxlength="20" minlength="3" required name="username">'))
})

test('HTML structural checks reject elements outside their required parent', () => {
  assertHtmlLessonFails(
    'html-navigation',
    htmlPage('  <nav aria-label="Primary"></nav><a href="/">Home</a><a href="/lessons">Lessons</a>'),
    'Labelled navigation contains both links',
  )
  assertHtmlLessonFails(
    'html-figure',
    htmlPage('  <figure></figure><img src="learner.png" alt="Student learning HTML"><figcaption>Learning in progress</figcaption>'),
    'Figure contains the image and caption together',
  )
  assertHtmlLessonFails(
    'html-form-submit',
    htmlPage('  <form action="/signup" method="post"></form><input type="email" name="email"><button type="submit">Join</button>'),
    'Signup form contains the email field and submit button',
  )
  assertHtmlLessonFails(
    'html-table',
    htmlPage('  <table></table><th>Name</th><th>Score</th><td>Ada</td><td>95</td>'),
    'Table contains header and data rows',
  )
})

test('HTML structural checks reject head and capstone content in the wrong region', () => {
  assertHtmlLessonFails(
    'html-canonical',
    htmlPage('  <link rel="canonical" href="https://example.com/lessons/html">'),
    'Canonical URL exists in head',
  )
  assertHtmlLessonFails(
    'html-audio',
    htmlPage('  <audio controls>Your browser does not support audio.</audio><source src="lesson.mp3" type="audio/mpeg">'),
    'Audio element contains its MPEG source and fallback text',
  )
  assertHtmlLessonFails(
    'html-full-page',
    htmlPage('  <a href="#content">Skip</a><header><nav aria-label="Primary"></nav></header><main id="content"><article><h1>Learn HTML</h1></article></main><form action="/signup" method="post"><label for="email">Email</label><input id="email" type="email"><button type="submit">Join</button></form><footer>CodeTrail</footer>'),
    'Main target contains article and signup form',
  )
})

test('HTML checks reject invalid structural shortcuts for advanced relationships', () => {
  assertHtmlLessonFails(
    'html-page-regions',
    htmlPage('  <header></header><main></main><footer></footer>'),
    'Each landmark contains text',
  )
  assertHtmlLessonFails(
    'html-form-submit',
    htmlPage('  <form action="/signup" method="post"><input type="email" name="email"><button type="submit"></button></form>'),
    'Signup form contains the email field and submit button',
  )
  assertHtmlLessonFails(
    'html-fieldsets',
    htmlPage('  <fieldset><legend>Pick one</legend><input type="radio" name="a"><input type="radio" name="b"></fieldset>'),
    'Fieldset contains a legend and at least two labelled radios with the same name',
  )
  assertHtmlLessonFails(
    'html-details',
    htmlPage('  <details><p>Answer</p><summary>Question</summary></details>'),
    'Disclosure contains summary first and a paragraph answer',
  )
  assertHtmlLessonFails(
    'html-picture',
    htmlPage('  <picture><img src="fallback.jpg" alt="x"><source media="(min-width:700px)" srcset="wide.webp"></picture>'),
    'Picture contains the wide source and fallback image',
  )
  assertHtmlLessonFails(
    'html-skip-link',
    htmlPage('  <header>Nav</header><a href="#content">Skip</a><main id="content">Main</main>'),
    'Skip link appears before header and main',
  )
  assertHtmlLessonFails(
    'html-safe-scripts',
    htmlPage('  <noscript>x</noscript>', '<title>App</title><script type="module" src="app.js" defer></script>'),
    'Deferred classic script exists in head',
  )
  assertHtmlLessonFails(
    'html-video',
    htmlPage('  <video controls><source src="movie.mp4"><track kind="captions" srclang="en"></video>'),
    'Video contains source and English captions track',
  )
  assertHtmlLessonFails(
    'html-aria-expanded',
    htmlPage('  <button type="button" aria-expanded="false" aria-controls="drawer"></button><div id="drawer">Links</div>'),
    'Button exposes collapsed state',
  )
  assertHtmlLessonFails(
    'html-full-page',
    htmlPage('  <a href="#content">Skip</a><header><nav aria-label="Primary"></nav></header><main id="content"><article><h1>Learn HTML</h1><p>Build meaningful web pages.</p></article><form action="/signup" method="post"><label for="email">Email</label><input id="email" name="email" type="email" required><button type="submit">Join</button></form></main><footer>CodeTrail</footer>'),
    'Header contains labelled navigation with a link',
  )
})
