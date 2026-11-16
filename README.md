# CodeTrail

CodeTrail is a browser practice app for learning web fundamentals by writing real code against live checks.

- **HTML Essentials**: 50 lessons on semantic structure, forms, media, accessibility, and metadata.
- **CSS Essentials**: 40 lessons on selectors, the box model, flexbox, grid, responsive design, and motion.
- **Playground**: a free HTML, CSS, and JavaScript sandbox with a console and shareable links.

Everything runs in the browser. There is no backend and no account; progress lives in local storage.

## How learning works

1. Each lesson gives one focused task and a list of requirements.
2. Requirements are checked as you type. HTML checks parse the document structure; CSS checks parse your rules and confirm they actually change the rendered preview.
3. When every requirement passes, complete the challenge (or press `Ctrl+Enter` / `Cmd+Enter`).
4. After completing, compare your code with a reference solution, then move on.

Lessons unlock in order, from fundamentals to a capstone. Completed lessons stay open for review.

## Run locally

Requires Node `^20.19.0` or `>=22.12.0` (see `.nvmrc`).

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run check   # lint, tests, production build
```

Lesson data (`src/stacks/*/data.json`) is generated from the lesson sources automatically before `dev`, `test`, and `build`. Run `npm run generate:stacks` to regenerate it by hand.

## Project structure

```text
src/
  App.jsx                  # Shell: routing, course state, top bar
  components/
    CodeEditor.jsx         # CodeMirror 6 editor
    Preview.jsx            # Sandboxed live preview frame
    LessonWorkspace.jsx    # Task, checks, editor, and preview for one lesson
    Playground.jsx         # Free sandbox with console and share links
    LessonSidebar.jsx, StackPicker.jsx, ConfirmDialog.jsx, Faq.jsx
  core/
    progress.js            # Pure progress and storage helpers
    preview.js             # Builds the preview document
    playground.js          # Playground storage and share link encoding
  stacks/
    registry.js            # Loads and caches course data at runtime
    sourceRegistry.js      # Build-time lesson sources
    html/                  # meta, lessons, factory, check runtime, preview styles
    css/                   # meta, lessons, factory, check runtime
scripts/
  generateStackJson.mjs    # Serializes lesson sources to data.json
tests/                     # node:test suites
```

### Preview

The preview is an `iframe` with `srcdoc` and `sandbox="allow-scripts allow-forms allow-modals"`. It has an opaque origin, so learner code cannot read the app's storage. A small runtime inside the frame:

- swaps CSS in place without reloading, so the page keeps its scroll position,
- restores scroll after markup changes rebuild the document,
- forwards `console` output and uncaught errors to the playground console,
- blocks navigation away from the preview and real form submissions.

### Adding a course

Create `src/stacks/<id>/` with `meta.js`, `lessons.js`, `source.js`, and a `runtime.js` that exports `hydrateLessons`. Register it in `registry.js` and `sourceRegistry.js`. Every check must expose a serializable descriptor so it survives the JSON build step. The tests verify that each canonical solution passes and each starter fails.

## Deploying to GitHub Pages

The workflow in `.github/workflows/deploy.yml` lints, tests, and builds every push and pull request, and deploys `main` to GitHub Pages.

1. Push the repository to GitHub.
2. Open **Settings > Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`, or run the workflow from the **Actions** tab.

The build uses a relative base path and hash routes (`#/playground`), so it works from a project subpath with no server configuration.
