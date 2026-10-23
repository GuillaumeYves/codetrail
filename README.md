# CodeTrail

CodeTrail is a browser practice app for learning web fundamentals through guided coding challenges.

Version `1.0.0` includes two shippable courses: 50 HTML lessons for semantic page structure and 40 CSS lessons for visual styling and layout.

## Run locally

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run generate:stacks
npm run lint
npm test
npm run build
```

The app is a Vite SPA with a relative base path, so the generated `dist` folder works from a GitHub Pages project subdirectory.

## Project structure

Stack-specific code lives under `src/stacks/<stack-id>/`.

```text
src/
  core/
    progress.js
  stacks/
    registry.js          # App-facing stack loader
    sourceRegistry.js    # Build-time stack source list
    html/
      meta.js            # Public metadata and generated data URL
      source.js          # Build-time lesson source export
      lessons.js         # Editable lesson source
      lessonFactory.js   # HTML lesson construction helpers
      runtime.js         # HTML check/hydration runtime
      data.json          # Generated deployable lesson data
    css/
      meta.js
      source.js
      lessons.js         # Fixed HTML previews and editable styles.css lessons
      lessonFactory.js
      runtime.js
      data.json
```

For future stacks, create a sibling folder such as `src/stacks/javascript/`, then register its `meta` and `source` files in `registry.js` and `sourceRegistry.js`.

## GitHub Pages deployment

The repository includes `.github/workflows/deploy.yml`.

To enable deployment:

1. Push the repository to GitHub.
2. Go to **Settings -> Pages**.
3. Set **Build and deployment -> Source** to **GitHub Actions**.
4. Push to `main`, or run the workflow manually from the **Actions** tab.

The workflow installs dependencies, regenerates stack JSON, runs lint/tests/build, uploads `dist`, and deploys it to GitHub Pages.
