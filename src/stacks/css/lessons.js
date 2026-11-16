import { createCssLessons } from './lessonFactory.js'

const previewHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS Preview Lab</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header class="site-header">
    <nav class="nav">
      <a class="brand-link" href="#">CodeTrail Studio</a>
      <ul class="nav-list">
        <li><a href="#">Work</a></li>
        <li><a href="#">Pricing</a></li>
        <li><a href="#">Contact</a></li>
      </ul>
    </nav>
  </header>

  <main class="lab-page">
    <section class="hero">
      <p class="eyebrow-label">CSS preview target</p>
      <h1 class="hero-title">Design the interface with CSS</h1>
      <p class="intro-copy">Every lesson edits styles.css while this HTML stays fixed, so the preview makes each CSS change visible.</p>
      <a class="cta-button" href="#">Launch style pass</a>
      <span class="badge">New</span>
    </section>

    <section class="content-shell">
      <h2 class="section-title">Cards and layout</h2>
      <div class="card-grid">
        <article class="preview-card featured-card">
          <span class="card-kicker">Featured</span>
          <h3 class="card-title">Visual system</h3>
          <p>Use selectors, spacing, and color to make this card read as a polished component.</p>
          <span class="stat-value">42%</span>
        </article>
        <article class="preview-card">
          <span class="card-kicker">Workflow</span>
          <h3 class="card-title">Fast iteration</h3>
          <p>Changes in styles.css update this preview immediately.</p>
        </article>
        <article class="preview-card">
          <span class="card-kicker">Review</span>
          <h3 class="card-title">Clear outcomes</h3>
          <p>Requirement checks focus on CSS behavior, not copied formatting.</p>
        </article>
      </div>
    </section>

    <section class="content-shell">
      <h2 class="section-title">Lists, actions, and forms</h2>
      <ul class="feature-list">
        <li>Selector targeting</li>
        <li>Box model practice</li>
        <li>Responsive layout</li>
      </ul>
      <div class="toolbar">
        <button class="ghost-button" type="button">Filter</button>
        <button class="ghost-button" type="button">Sort</button>
        <a class="cta-button secondary-action" href="#">Save view</a>
      </div>
      <form class="signup-form">
        <label>Name <input class="field" name="name" placeholder="Ada Lovelace"></label>
        <label>Email <input class="field" type="email" name="email" placeholder="ada@example.com"></label>
      </form>
    </section>

    <section class="content-shell">
      <h2 class="section-title">Data and status</h2>
      <table class="metrics-table">
        <tr><th>Metric</th><th>Status</th></tr>
        <tr><td>Contrast</td><td>Ready</td></tr>
        <tr><td>Spacing</td><td>Review</td></tr>
      </table>
      <blockquote class="quote">Good CSS makes state, hierarchy, and layout obvious.</blockquote>
      <div class="timeline">
        <article class="timeline-item">Plan</article>
        <article class="timeline-item">Style</article>
        <article class="timeline-item">Refine</article>
      </div>
    </section>

    <section class="pricing-grid">
      <article class="pricing-card">
        <h2>Starter</h2>
        <p>For the first styling pass.</p>
      </article>
      <article class="pricing-card">
        <h2>Studio</h2>
        <p>For a complete visual system.</p>
      </article>
    </section>
  </main>
</body>
</html>`

// Fixed markup plus optional lesson base styles. styles.css is the learner file.
const previewFiles = (baseCss = '') => ({
  '/index.html': previewHtml,
  '/base.css': baseCss,
})

const featuredBorderBase = '.featured-card {\n  border: 2px solid transparent;\n}\n'
const cardSurfaceBase = '.preview-card {\n  background-color: #f8fafc;\n  border: 1px solid #cbd5e1;\n}\n'
const toolbarFlexBase = '.toolbar {\n  display: flex;\n}\n'
const cardGridBase = '.card-grid {\n  display: grid;\n}\n'
const cardGridColumnsBase = '.card-grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n}\n'
const navFlexBase = '.nav-list {\n  display: flex;\n}\n'
const ctaHoverBase = '.cta-button:hover {\n  background-color: #1d4ed8;\n}\n'

const starter = '/* Write the CSS for this challenge below. */\n'
const rule = (selector, declarations) => ({ type: 'css-rule', selector, declarations })
const ruleWithSelectors = (selectors, declarations) => ({ type: 'css-rule', selectors, declarations })
const mediaRule = (queryContains, selector, declarations) => ({
  type: 'css-media-rule',
  queryContains,
  selector,
  declarations,
})
const atRule = (name, options = {}) => ({ type: 'css-at-rule', name, ...options })

const anyValue = true
const colorValue = { pattern: '^(#[0-9a-f]{3,8}|[a-z]+|rgb\\(|hsl\\()' }
const lengthValue = { pattern: '^-?\\d*\\.?\\d+(px|rem|em|%|vh|vw)$' }
const shadowValue = { pattern: '(^| )-?\\d' }
const repeatGridValue = { contains: 'repeat(' }

const specs = [
  {
    id: 'text-color',
    title: 'Color one clear target',
    topic: 'Selectors',
    objective: 'Target .hero-title and give it a visible text color.',
    concept: 'A class selector styles every element with that class. Start by changing one obvious preview target.',
    hint: 'Write a .hero-title rule and add a color declaration.',
    code: starter,
    solution: '.hero-title {\n  color: #1d4ed8;\n}\n',
    checks: [
      ['Hero title has a color declaration', rule('.hero-title', { color: colorValue })],
    ],
  },
  {
    id: 'card-background',
    title: 'Paint a component surface',
    topic: 'Colors',
    objective: 'Target .preview-card and set a background-color so the cards become distinct blocks.',
    concept: 'background-color changes the painted surface behind an element content area and padding.',
    hint: 'Use background-color on .preview-card.',
    code: starter,
    solution: '.preview-card {\n  background-color: #f8fafc;\n}\n',
    checks: [
      ['Preview cards have a background color', rule('.preview-card', { 'background-color': colorValue })],
    ],
  },
  {
    id: 'font-size',
    title: 'Scale the main heading',
    topic: 'Typography',
    objective: 'Make .hero-title larger by setting font-size.',
    concept: 'font-size controls text scale. rem values are predictable because they are based on the root font size.',
    hint: 'A value like 3rem or 48px will make the heading visibly larger.',
    code: starter,
    solution: '.hero-title {\n  font-size: 3rem;\n}\n',
    checks: [
      ['Hero title has a font size', rule('.hero-title', { 'font-size': lengthValue })],
    ],
  },
  {
    id: 'font-weight',
    title: 'Strengthen important text',
    topic: 'Typography',
    objective: 'Make .stat-value visually bold with font-weight.',
    concept: 'font-weight controls the weight of text. Numeric values such as 700 are useful in design systems.',
    hint: 'Target .stat-value and use font-weight.',
    code: starter,
    solution: '.stat-value {\n  font-weight: 800;\n}\n',
    checks: [
      ['Stat value has a strong font weight', rule('.stat-value', { 'font-weight': { pattern: '^(bold|[6-9]00)$' } })],
    ],
  },
  {
    id: 'line-height',
    title: 'Make body copy easier to read',
    topic: 'Typography',
    objective: 'Set line-height on .intro-copy so the paragraph breathes.',
    concept: 'line-height controls the vertical rhythm inside multi-line text.',
    hint: 'Use a unitless value such as 1.6.',
    code: starter,
    solution: '.intro-copy {\n  line-height: 1.7;\n}\n',
    checks: [
      ['Intro copy has readable line height', rule('.intro-copy', { 'line-height': { minNumber: 1.2 } })],
    ],
  },
  {
    id: 'text-align',
    title: 'Center the hero content',
    topic: 'Alignment',
    objective: 'Center the text inside .hero with text-align.',
    concept: 'text-align aligns inline content and text inside a block.',
    hint: 'The value should be center.',
    code: starter,
    solution: '.hero {\n  text-align: center;\n}\n',
    checks: [
      ['Hero text is centered', rule('.hero', { 'text-align': 'center' })],
    ],
  },
  {
    id: 'badge-style',
    title: 'Style a small label',
    topic: 'Inline UI',
    objective: 'Target .badge and use text-transform to make the badge uppercase.',
    concept: 'Small interface labels often use casing rules to separate metadata from body copy.',
    hint: 'Use text-transform: uppercase on .badge.',
    code: starter,
    solution: '.badge {\n  text-transform: uppercase;\n}\n',
    checks: [
      ['Badge text is transformed to uppercase', rule('.badge', { 'text-transform': 'uppercase' })],
    ],
  },
  {
    id: 'descendant-selector',
    title: 'Target list items in context',
    topic: 'Selectors',
    objective: 'Use a descendant selector to set color on only the li elements inside .feature-list.',
    concept: 'A descendant selector styles elements only when they appear inside a specific ancestor.',
    hint: 'Write .feature-list li and add color.',
    code: starter,
    solution: '.feature-list li {\n  color: #0f766e;\n}\n',
    checks: [
      ['Feature list items are targeted by context', rule('.feature-list li', { color: colorValue })],
    ],
  },
  {
    id: 'grouped-selectors',
    title: 'Share one declaration',
    topic: 'Selectors',
    objective: 'Use one grouped selector for .section-title and .card-title, then set their color.',
    concept: 'Selector lists let related elements share a declaration without duplicating rules.',
    hint: 'Separate selectors with a comma before the declaration block.',
    code: starter,
    solution: '.section-title,\n.card-title {\n  color: #334155;\n}\n',
    checks: [
      ['Section and card titles share one color rule', ruleWithSelectors(['.section-title', '.card-title'], { color: colorValue })],
    ],
  },
  {
    id: 'border-color',
    title: 'Outline the featured card',
    topic: 'Borders',
    objective: 'Target .featured-card and set border-color. The card already has a transparent border in the preview.',
    concept: 'Border color can highlight a component without changing its content.',
    hint: 'Use only border-color on .featured-card; the base preview already provides the border width and style.',
    code: starter,
    files: previewFiles(featuredBorderBase),
    solution: '.featured-card {\n  border-color: #2563eb;\n}\n',
    checks: [
      ['Featured card has a border color', rule('.featured-card', { 'border-color': colorValue })],
    ],
  },
  {
    id: 'padding',
    title: 'Add internal space',
    topic: 'Box model',
    objective: 'Add padding to .preview-card so card content moves away from the visible card edge.',
    concept: 'padding creates space between an element border and its content.',
    hint: 'The preview already gives the card a surface; use padding with a length value.',
    code: starter,
    files: previewFiles(cardSurfaceBase),
    solution: '.preview-card {\n  padding: 1.25rem;\n}\n',
    checks: [
      ['Preview cards have padding', rule('.preview-card', { padding: lengthValue })],
    ],
  },
  {
    id: 'margin',
    title: 'Separate page sections',
    topic: 'Box model',
    objective: 'Add margin to .content-shell so sections are separated from nearby content.',
    concept: 'margin creates space outside an element.',
    hint: 'Use margin with a length or auto value.',
    code: starter,
    solution: '.content-shell {\n  margin: 2rem auto;\n}\n',
    checks: [
      ['Content shell has margin', rule('.content-shell', { margin: anyValue })],
    ],
  },
  {
    id: 'border',
    title: 'Draw a component boundary',
    topic: 'Borders',
    objective: 'Give .preview-card a border.',
    concept: 'The border shorthand sets width, style, and color in one declaration.',
    hint: 'Use a border value that includes solid.',
    code: starter,
    solution: '.preview-card {\n  border: 1px solid #cbd5e1;\n}\n',
    checks: [
      ['Preview cards have a solid border', rule('.preview-card', { border: { contains: 'solid' } })],
    ],
  },
  {
    id: 'radius',
    title: 'Soften component corners',
    topic: 'Borders',
    objective: 'Set border-radius on .preview-card. The preview already gives cards a visible surface and border.',
    concept: 'border-radius rounds box corners and is common for cards, inputs, and buttons.',
    hint: 'Use border-radius with a length value; the fixed card surface will show the rounded corners.',
    code: starter,
    files: previewFiles(cardSurfaceBase),
    solution: '.preview-card {\n  border-radius: 0.75rem;\n}\n',
    checks: [
      ['Preview cards have rounded corners', rule('.preview-card', { 'border-radius': lengthValue })],
    ],
  },
  {
    id: 'shadow',
    title: 'Lift cards from the page',
    topic: 'Effects',
    objective: 'Add box-shadow to the visible .preview-card surfaces.',
    concept: 'box-shadow creates depth when used subtly.',
    hint: 'A shadow value needs lengths and a color.',
    code: starter,
    files: previewFiles(cardSurfaceBase),
    solution: '.preview-card {\n  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.14);\n}\n',
    checks: [
      ['Preview cards have a shadow', rule('.preview-card', { 'box-shadow': shadowValue })],
    ],
  },
  {
    id: 'display-flex',
    title: 'Turn tools into a row',
    topic: 'Flexbox',
    objective: 'Set display: flex on .toolbar.',
    concept: 'Flexbox arranges children along one axis and is ideal for toolbars.',
    hint: 'Use display: flex.',
    code: starter,
    solution: '.toolbar {\n  display: flex;\n}\n',
    checks: [
      ['Toolbar uses flex layout', rule('.toolbar', { display: 'flex' })],
    ],
  },
  {
    id: 'gap',
    title: 'Space flex children',
    topic: 'Flexbox',
    objective: 'Add gap to the flex .toolbar.',
    concept: 'gap creates consistent space between flex or grid children.',
    hint: 'The preview already makes the toolbar a flex row; add a length value for gap.',
    code: starter,
    files: previewFiles(toolbarFlexBase),
    solution: '.toolbar {\n  gap: 0.75rem;\n}\n',
    checks: [
      ['Toolbar has a gap', rule('.toolbar', { gap: lengthValue })],
    ],
  },
  {
    id: 'justify-content',
    title: 'Distribute toolbar actions',
    topic: 'Flexbox',
    objective: 'Use justify-content on the flex .toolbar to distribute its children.',
    concept: 'justify-content controls spacing along the main flex axis.',
    hint: 'The preview already makes .toolbar flex; use a value like space-between, center, or flex-end.',
    code: starter,
    files: previewFiles(toolbarFlexBase),
    solution: '.toolbar {\n  justify-content: space-between;\n}\n',
    checks: [
      ['Toolbar controls main-axis alignment', rule('.toolbar', { 'justify-content': true })],
    ],
  },
  {
    id: 'nav-list',
    title: 'Make navigation horizontal',
    topic: 'Lists',
    objective: 'Remove bullets from .nav-list and make it a flex row.',
    concept: 'Navigation lists are still lists in HTML, but CSS controls their visual layout.',
    hint: 'Use list-style: none and display: flex on .nav-list.',
    code: starter,
    solution: '.nav-list {\n  list-style: none;\n  display: flex;\n}\n',
    checks: [
      ['Navigation removes list bullets', rule('.nav-list', { 'list-style': 'none' })],
      ['Navigation list uses flex layout', rule('.nav-list', { display: 'flex' })],
    ],
  },
  {
    id: 'max-width',
    title: 'Constrain reading width',
    topic: 'Layout',
    objective: 'Set max-width on .content-shell and center it with margin.',
    concept: 'max-width keeps long content readable on wide screens. Auto side margins center fixed-width blocks.',
    hint: 'Use max-width and margin: auto or a two-value margin with auto.',
    code: starter,
    solution: '.content-shell {\n  max-width: 72rem;\n  margin: 2rem auto;\n}\n',
    checks: [
      ['Content shell has a max width', rule('.content-shell', { 'max-width': lengthValue })],
      ['Content shell is centered with margin', rule('.content-shell', { margin: { contains: 'auto' } })],
    ],
  },
  {
    id: 'card-grid',
    title: 'Create a card grid',
    topic: 'Grid',
    objective: 'Set display: grid on .card-grid.',
    concept: 'CSS Grid arranges content in rows and columns.',
    hint: 'Use display: grid.',
    code: starter,
    solution: '.card-grid {\n  display: grid;\n}\n',
    checks: [
      ['Card grid uses CSS Grid', rule('.card-grid', { display: 'grid' })],
    ],
  },
  {
    id: 'grid-columns',
    title: 'Define card columns',
    topic: 'Grid',
    objective: 'Set grid-template-columns on the grid .card-grid using repeat().',
    concept: 'grid-template-columns defines the column tracks in a grid.',
    hint: 'The preview already makes .card-grid a grid; use repeat(3, 1fr) or repeat(auto-fit, minmax(...)).',
    code: starter,
    files: previewFiles(cardGridBase),
    solution: '.card-grid {\n  grid-template-columns: repeat(3, 1fr);\n}\n',
    checks: [
      ['Card grid defines repeated columns', rule('.card-grid', { 'grid-template-columns': repeatGridValue })],
    ],
  },
  {
    id: 'pricing-grid',
    title: 'Lay out pricing cards',
    topic: 'Grid',
    objective: 'Set display: grid and gap on .pricing-grid.',
    concept: 'A grid container plus gap is the foundation for repeated card layouts.',
    hint: 'Target .pricing-grid with display and gap.',
    code: starter,
    solution: '.pricing-grid {\n  display: grid;\n  gap: 1rem;\n}\n',
    checks: [
      ['Pricing area uses grid layout', rule('.pricing-grid', { display: 'grid' })],
      ['Pricing grid has a gap', rule('.pricing-grid', { gap: lengthValue })],
    ],
  },
  {
    id: 'pricing-card',
    title: 'Build a reusable card rule',
    topic: 'Components',
    objective: 'Style .pricing-card with padding and border.',
    concept: 'Reusable component classes let repeated markup share the same visual treatment.',
    hint: 'Put padding and border in the same .pricing-card rule.',
    code: starter,
    solution: '.pricing-card {\n  padding: 1rem;\n  border: 1px solid #cbd5e1;\n}\n',
    checks: [
      ['Pricing card has padding and border', rule('.pricing-card', { padding: lengthValue, border: { contains: 'solid' } })],
    ],
  },
  {
    id: 'link-button',
    title: 'Make a link feel actionable',
    topic: 'Components',
    objective: 'Style .cta-button with display: inline-block and remove text-decoration.',
    concept: 'Links can be styled as buttons while keeping anchor semantics.',
    hint: 'Use display: inline-block and text-decoration: none.',
    code: starter,
    solution: '.cta-button {\n  display: inline-block;\n  text-decoration: none;\n}\n',
    checks: [
      ['Call-to-action behaves like a button box', rule('.cta-button', { display: 'inline-block' })],
      ['Call-to-action removes underline decoration', rule('.cta-button', { 'text-decoration': 'none' })],
    ],
  },
  {
    id: 'hover-state',
    title: 'Add a hover state',
    topic: 'States',
    objective: 'Create a .cta-button:hover rule that changes background-color.',
    concept: 'Pseudo-classes style interactive states without changing the HTML.',
    hint: 'Write .cta-button:hover and add background-color.',
    code: starter,
    solution: '.cta-button:hover {\n  background-color: #1d4ed8;\n}\n',
    checks: [
      ['Call-to-action hover changes background color', rule('.cta-button:hover', { 'background-color': colorValue })],
    ],
  },
  {
    id: 'focus-state',
    title: 'Show keyboard focus',
    topic: 'States',
    objective: 'Create a .field:focus rule with an outline.',
    concept: 'Focus styles help keyboard users see which control is active.',
    hint: 'Use outline on .field:focus.',
    code: starter,
    solution: '.field:focus {\n  outline: 3px solid #2563eb;\n}\n',
    checks: [
      ['Focused fields have an outline', rule('.field:focus', { outline: { contains: 'solid' } })],
    ],
  },
  {
    id: 'custom-property',
    title: 'Define a reusable color',
    topic: 'Custom properties',
    objective: 'Define --accent on :root.',
    concept: 'Custom properties store reusable values that can be referenced elsewhere with var().',
    hint: 'Use :root and create --accent.',
    code: starter,
    solution: ':root {\n  --accent: #2563eb;\n}\n',
    checks: [
      ['Root defines an accent custom property', rule(':root', { '--accent': colorValue })],
    ],
  },
  {
    id: 'use-variable',
    title: 'Use a custom property',
    topic: 'Custom properties',
    objective: 'Set .cta-button background-color with var(--accent).',
    concept: 'var() reads a custom property so related components can share a design token.',
    hint: 'Use background-color: var(--accent) on .cta-button.',
    code: ':root {\n  --accent: #2563eb;\n}\n',
    solution: ':root {\n  --accent: #2563eb;\n}\n\n.cta-button {\n  background-color: var(--accent);\n}\n',
    checks: [
      ['Call-to-action uses the accent variable', rule('.cta-button', { 'background-color': { contains: 'var(--accent)' } })],
    ],
  },
  {
    id: 'transition',
    title: 'Smooth state changes',
    topic: 'Motion',
    objective: 'Add transition to .cta-button so its existing hover color change animates.',
    concept: 'transition smooths property changes such as hover colors.',
    hint: 'The fixed preview already has a hover color change; add transition with a duration such as 180ms.',
    code: starter,
    files: previewFiles(ctaHoverBase),
    solution: '.cta-button {\n  transition: background-color 180ms ease, transform 180ms ease;\n}\n',
    checks: [
      ['Call-to-action has a transition', rule('.cta-button', { transition: true })],
    ],
  },
  {
    id: 'nth-child',
    title: 'Style one repeated item',
    topic: 'Selectors',
    objective: 'Use .timeline-item:nth-child(2) to style the second timeline item.',
    concept: 'Structural pseudo-classes target elements based on their position among siblings.',
    hint: 'Write .timeline-item:nth-child(2) and change background-color.',
    code: starter,
    solution: '.timeline-item:nth-child(2) {\n  background-color: #dbeafe;\n}\n',
    checks: [
      ['Second timeline item has a targeted style', rule('.timeline-item:nth-child(2)', { 'background-color': colorValue })],
    ],
  },
  {
    id: 'media-card-grid',
    title: 'Stack cards on small screens',
    topic: 'Responsive CSS',
    objective: 'Inside a max-width media query, set the existing .card-grid columns to 1fr.',
    concept: 'Media queries let layout respond to viewport width.',
    hint: 'The preview starts as a three-column grid; use @media (max-width: 700px) and put .card-grid inside it.',
    code: starter,
    files: previewFiles(cardGridColumnsBase),
    solution: '@media (max-width: 700px) {\n  .card-grid {\n    grid-template-columns: 1fr;\n  }\n}\n',
    checks: [
      ['Small-screen media query stacks the card grid', mediaRule('max-width', '.card-grid', { 'grid-template-columns': '1fr' })],
    ],
  },
  {
    id: 'media-nav',
    title: 'Reflow navigation',
    topic: 'Responsive CSS',
    objective: 'Inside a max-width media query, set the existing .nav-list flex-direction to column.',
    concept: 'Responsive navigation often changes direction when horizontal space is limited.',
    hint: 'The preview starts with a flex navigation row; put .nav-list inside a max-width media query.',
    code: starter,
    files: previewFiles(navFlexBase),
    solution: '@media (max-width: 700px) {\n  .nav-list {\n    flex-direction: column;\n  }\n}\n',
    checks: [
      ['Small-screen media query stacks navigation links', mediaRule('max-width', '.nav-list', { 'flex-direction': 'column' })],
    ],
  },
  {
    id: 'sticky-header',
    title: 'Keep navigation visible',
    topic: 'Positioning',
    objective: 'Make .site-header sticky and pin it to the top.',
    concept: 'position: sticky keeps an element in normal flow until it reaches an offset.',
    hint: 'Use position: sticky and top: 0.',
    code: starter,
    solution: '.site-header {\n  position: sticky;\n  top: 0;\n}\n',
    checks: [
      ['Site header is sticky at the top', rule('.site-header', { position: 'sticky', top: { oneOf: ['0', '0px'] } })],
    ],
  },
  {
    id: 'absolute-badge',
    title: 'Place a badge inside a card',
    topic: 'Positioning',
    objective: 'Make .featured-card position: relative and .badge position: absolute.',
    concept: 'Absolute children position against the nearest positioned ancestor.',
    hint: 'Set position on both selectors.',
    code: starter,
    solution: '.featured-card {\n  position: relative;\n}\n\n.badge {\n  position: absolute;\n  top: 1rem;\n  right: 1rem;\n}\n',
    checks: [
      ['Featured card creates a positioning context', rule('.featured-card', { position: 'relative' })],
      ['Badge is absolutely positioned', rule('.badge', { position: 'absolute' })],
    ],
  },
  {
    id: 'pseudo-element',
    title: 'Add generated decoration',
    topic: 'Pseudo-elements',
    objective: 'Create .quote::before with a content declaration.',
    concept: 'Pseudo-elements create style-only pieces of a component without changing HTML.',
    hint: 'Use .quote::before and content.',
    code: starter,
    solution: '.quote::before {\n  content: "“";\n}\n',
    checks: [
      ['Quote has generated before content', rule('.quote::before', { content: true })],
    ],
  },
  {
    id: 'keyframes',
    title: 'Define a small animation',
    topic: 'Animation',
    objective: 'Create @keyframes pulse and use animation on .badge.',
    concept: '@keyframes defines animation steps; animation applies them to an element.',
    hint: 'Name the keyframes pulse and apply animation to .badge.',
    code: starter,
    solution: '@keyframes pulse {\n  from { opacity: 0.65; }\n  to { opacity: 1; }\n}\n\n.badge {\n  animation: pulse 1s ease-in-out infinite alternate;\n}\n',
    checks: [
      ['Pulse keyframes are defined', atRule('keyframes', { queryContains: 'pulse' })],
      ['Badge uses animation', rule('.badge', { animation: { contains: 'pulse' } })],
    ],
  },
  {
    id: 'reduced-motion',
    title: 'Respect motion preferences',
    topic: 'Accessibility',
    objective: 'Inside a prefers-reduced-motion media query, set .badge animation to none.',
    concept: 'prefers-reduced-motion lets users avoid unnecessary animation.',
    hint: 'Use @media (prefers-reduced-motion: reduce).',
    code: '.badge {\n  animation: pulse 1s infinite;\n}\n',
    solution: '.badge {\n  animation: pulse 1s infinite;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .badge {\n    animation: none;\n  }\n}\n',
    checks: [
      ['Reduced-motion media query disables badge animation', mediaRule('prefers-reduced-motion:reduce', '.badge', { animation: 'none' })],
    ],
  },
  {
    id: 'table-stripes',
    title: 'Stripe table rows',
    topic: 'Selectors',
    objective: 'Use .metrics-table tr:nth-child(even) to set a background-color.',
    concept: 'Structural selectors are useful for repeated data, such as table rows.',
    hint: 'Target even rows and add background-color.',
    code: starter,
    solution: '.metrics-table tr:nth-child(even) {\n  background-color: #f1f5f9;\n}\n',
    checks: [
      ['Even metric rows have a background color', rule('.metrics-table tr:nth-child(even)', { 'background-color': colorValue })],
    ],
  },
  {
    id: 'capstone',
    title: 'Style the preview page',
    topic: 'Capstone',
    objective: 'Combine variables, layout, cards, hover state, and a responsive media query to style the fixed preview page.',
    concept: 'A complete CSS pass combines reusable values, layout rules, component styles, states, and responsive behavior.',
    hint: 'Define --accent, center .lab-page, make .card-grid a grid, add a hover state, and include a max-width media query.',
    code: starter,
    solution: ':root {\n  --accent: #2563eb;\n}\n\n.lab-page {\n  max-width: 72rem;\n  margin: 0 auto;\n}\n\n.card-grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 1rem;\n}\n\n.preview-card {\n  padding: 1rem;\n  border: 1px solid #cbd5e1;\n  border-radius: 0.75rem;\n}\n\n.cta-button:hover {\n  background-color: var(--accent);\n}\n\n@media (max-width: 700px) {\n  .card-grid {\n    grid-template-columns: 1fr;\n  }\n}\n',
    checks: [
      ['Accent variable is defined', rule(':root', { '--accent': colorValue })],
      ['Lab page is centered with a max width', rule('.lab-page', { 'max-width': lengthValue, margin: { contains: 'auto' } })],
      ['Card grid uses columns and gap', rule('.card-grid', { display: 'grid', 'grid-template-columns': repeatGridValue, gap: lengthValue })],
      ['Cards have component styling', rule('.preview-card', { padding: lengthValue, border: { contains: 'solid' }, 'border-radius': lengthValue })],
      ['Button has a hover state', rule('.cta-button:hover', { 'background-color': true })],
      ['Small-screen media query stacks cards', mediaRule('max-width', '.card-grid', { 'grid-template-columns': '1fr' })],
    ],
  },
]

export const cssLessons = createCssLessons(specs.map((lesson) => ({
  ...lesson,
  files: lesson.files ?? previewFiles(),
})))
