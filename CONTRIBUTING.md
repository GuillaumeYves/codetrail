# Contributing to CodeTrail

Thanks for helping people learn to code. Bug reports, lesson fixes, translations, and new ideas are all welcome.

## Before you start

- **Found a bug or a confusing lesson?** [Open an issue](https://github.com/GuillaumeYves/codetrail/issues). Name the course and lesson, say what you expected, and paste the code you tried.
- **Planning something large**, like a new course or a new feature? Open an issue first so we can agree on the approach before you spend time on it.
- **Small fixes**, like a typo, a clearer hint, or a wrong check, can go straight to a pull request.

## Set up the project

You need [Node.js](https://nodejs.org/) 20.19+ or 22.12+.

```bash
git clone https://github.com/GuillaumeYves/codetrail.git
cd codetrail
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the app with live reload |
| `npm test` | Runs the test suite |
| `npm run lint` | Checks code style |
| `npm run check` | Lint, tests, and a production build. Run it before opening a pull request. |

`package.json` pins `@emnapi/core` and `@emnapi/runtime` as dev dependencies. They look unused, but they keep `npm ci` working for the build tool's WebAssembly fallback. Please leave them in place.

## How the project is organized

```
src/
  components/        React interface
  core/              Logic shared by every course (progress, previews, loop guard)
  i18n/locales/      Interface text, one JSON file per language
  stacks/<course>/   One folder per course: html, css, js
    lessons.js       The lessons themselves
    lessonFactory.js Stages, numbering, and shared lesson text
    runtime.js       How the checks run in the browser
    locales/         Lesson text, one JSON file per language
tests/               node:test suites
```

## Writing or changing a lesson

Lessons live in `src/stacks/<course>/lessons.js`. The JSON files next to them are generated from that file when you run `npm run dev`, `npm test`, or `npm run build`, so edit `lessons.js`, never `data.json` or `locales/en.json`.

Each lesson has:

- **`title`, `topic`, `summary`, `objective`**: what the lesson teaches and exactly what the learner must do. If a check compares an exact value, such as an id, a URL, or a printed text, the objective must state it.
- **`hints`**: three hints that go from a nudge, to a direction, to a near answer. Wrap code in backticks: `` `<p>` ``. Code that itself contains a backtick goes between double backticks: ``` ``const a = `${b}` `` ```.
- **`code`**: the starter file. Keep it free of English prose, since it is shown in every language. An empty starter shows a translated placeholder instead.
- **`solution`**: one clean reference answer, shown after the lesson is completed.
- **`checks`**: a list of `[label, check]` pairs. Each label is one short requirement the learner sees tick off.

### Keep the difficulty gradual

- A lesson only uses what earlier lessons in the course have taught.
- One new idea per lesson. If a lesson needs two new ideas, split it.
- Stages hold ten lessons each in the CSS and JavaScript courses (13, 13, 12, 12 in HTML). Moving a lesson between stages means updating the stage sizes in `lessonFactory.js` and the tests.
- Each course ends with a capstone that combines the earlier lessons.

### Checks

- **HTML** checks read the parsed document: elements, attributes, order, and labels.
- **CSS** checks read the parsed stylesheet: selectors, properties, values, and media queries.
- **JavaScript** checks come in four kinds:
  - `js-syntax`: reads the code without running it (a declaration, a call, a syntax node).
  - `js-value`: runs the code and compares an expression, such as `greet('Ada')`.
  - `js-log`: compares what the code printed to the console.
  - `js-dom`: clicks, types, or submits in the lesson page, then inspects the result.

  JavaScript runs in a hidden sandboxed frame, and a loop guard stops loops that never end.

Checks should accept every correct answer, not only the reference solution. Test the obvious alternatives: `score += 10` and `score = score + 10`, a `for` loop and a `for...of` loop, and so on.

The tests verify that every reference solution passes its own checks. In the JavaScript course they also verify that no starter passes before the learner writes anything, and that a few common mistakes are caught. When you fix a check, add the case that was wrong to `tests/js.test.js` or `tests/lessons.test.js`.

## Translating CodeTrail

All text lives in JSON files, so you can translate without touching any code. French is a complete example to compare with.

1. Copy `src/i18n/locales/en.json` to a file named after your language code, such as `es.json`. This covers the interface.
2. Copy `locales/en.json` in each course folder (`src/stacks/html`, `css`, and `js`) the same way. These cover the lessons, hints, and requirements.
3. Translate the values only. Keep the keys, the `{placeholders}`, and the number of code spans in each hint.
4. Inside code spans, you may translate visible sample text, such as `<p>Your sentence here.</p>`. Keep the code itself unchanged.
5. Keep values the checks compare in their original form. For example, the JavaScript lessons ask for an exact output like `Hello, world!`, and that output stays in English.
6. Run `npm test`.

The tests check that every key exists in English, that placeholders and code spans match, and that a shipped language covers every lesson, hint, and requirement. The new language appears in the language menu automatically.

## Pull requests

- Keep each pull request focused on one change.
- Describe what changed and why. For a lesson change, name the lesson.
- Run `npm run check` and make sure it passes.
- Keep code comments short and useful.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
