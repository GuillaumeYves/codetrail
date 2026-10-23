import { useEffect, useMemo, useRef, useState } from "react";
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useActiveCode,
} from "@codesandbox/sandpack-react";
import cssIcon from "devicon/icons/css3/css3-original.svg";
import htmlIcon from "devicon/icons/html5/html5-original.svg";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Circle,
  Lightbulb,
  Lock,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  X,
} from "lucide-react";
import { stacks, loadStack, stackIds } from "./stacks/registry.js";
import {
  firstAvailableLessonId,
  isLessonUnlocked,
  redoLessonProgress,
  resetAllProgress,
} from "./core/progress.js";

const DEFAULT_STACK_ID = "html";
const STORAGE_KEY = "codetrail-progress-v1";
const LEGACY_STORAGE_KEYS = [
  "code-trail-progress-v1",
  "practice-react-progress-v1",
];
const RESET_CONFIRM_DELAY_MS = 3000;
const EMPTY_LESSONS = [];
const EMPTY_PREVIEW_SCRIPT = "// CodeTrail lessons do not need JavaScript.\n";
const STACK_PREFIXES = stackIds.map((id) => `${id}-`);
const APP_VERSION = "v1.0.0";
const DEFAULT_STACK_ACTIVITY = "Web development";
const STACK_GROUPS = stackIds.reduce((groups, id) => {
  const stack = stacks[id] ?? {};
  const activity = stack.activity ?? DEFAULT_STACK_ACTIVITY;
  let group = groups.find((item) => item.activity === activity);

  if (!group) {
    group = { activity, stackIds: [] };
    groups.push(group);
  }

  group.stackIds.push(id);
  return groups;
}, []);

const PREVIEW_BASE_STYLES = `* { box-sizing: border-box; }
html { min-height: 100%; background: #0d1117; }
body {
  min-height: 100vh;
  margin: 0;
  padding: 2rem;
  background: #0d1117;
  color: #e6edf3;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
h1, h2, h3, p { margin-top: 0; }
p { max-width: 60ch; line-height: 1.55; }
a { color: #58a6ff; }
img, video { max-width: 100%; }
main, article, section, form, table, figure, details, dialog, template, header, footer, nav, aside {
  max-width: 48rem;
}
header, main, footer, section, article, aside, nav, figure, form, details, dialog {
  margin-block: 1rem;
}
nav, .toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem;
}
ul, ol { padding-left: 1.35rem; }
li { margin-block: .35rem; }
table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border: 1px solid #30363d;
  border-radius: .75rem;
}
th, td {
  padding: .7rem .8rem;
  border: 1px solid #30363d;
  text-align: left;
}
th { background: #161b22; }
form {
  display: grid;
  gap: .8rem;
  max-width: 26rem;
}
label { display: grid; gap: .35rem; }
input, select, textarea, button {
  padding: .65rem .75rem;
  border: 1px solid #484f58;
  border-radius: .45rem;
  background: #161b22;
  color: inherit;
  font: inherit;
}
button {
  width: max-content;
  border-color: #238636;
  background: #238636;
  color: #fff;
  cursor: pointer;
}
figure {
  padding: 1rem;
  border: 1px solid #30363d;
  border-radius: .75rem;
  background: #161b22;
}
figcaption, small, caption { color: #8b949e; }
blockquote {
  margin-inline: 0;
  padding-left: 1rem;
  border-left: 3px solid #58a6ff;
  color: #c9d1d9;
}
pre, code {
  border-radius: .4rem;
  background: #161b22;
  color: #e6edf3;
  font-family: "JetBrains Mono", Consolas, monospace;
}
pre {
  max-width: 100%;
  overflow: auto;
  padding: 1rem;
}
.card {
  padding: 1rem;
  border: 1px solid #30363d;
  border-radius: .75rem;
  background: #161b22;
}`;

const SANDPACK_THEME = {
  colors: {
    surface1: "#0d1117",
    surface2: "#161b22",
    surface3: "#21262d",
    clickable: "#8b949e",
    base: "#e6edf3",
    disabled: "#484f58",
    hover: "#f0f6fc",
    accent: "#58a6ff",
    error: "#f85149",
    errorSurface: "#3d1f1f",
  },
  syntax: {
    plain: "#e6edf3",
    comment: { color: "#8b949e", fontStyle: "italic" },
    keyword: "#ff7b72",
    tag: "#7ee787",
    punctuation: "#c9d1d9",
    definition: "#d2a8ff",
    property: "#79c0ff",
    static: "#ffa657",
    string: "#a5d6ff",
  },
  font: {
    body: "DM Sans, Inter, ui-sans-serif, system-ui, sans-serif",
    mono: "JetBrains Mono, Consolas, monospace",
    size: "14px",
    lineHeight: "1.65",
  },
};

const faqItems = [
  {
    question: "How do the challenges work?",
    answer:
      "Read the task, edit the active file, and watch the preview update. The requirements update automatically. When every requirement passes, you can complete the challenge.",
  },
  {
    question: "Is my code sent or published anywhere?",
    answer:
      "CodeTrail does not publish your solutions. Lesson code and progress are stored in this browser’s local storage. The preview runs in an isolated browser sandbox.",
  },
  {
    question: "Where is my progress saved?",
    answer:
      "Progress is saved locally in this browser. Clearing site data or switching browsers or devices will reset it.",
  },
  {
    question: "Can I reset a challenge?",
    answer:
      "The red reset button in the navbar clears every completion and saved editor change. The smaller redo button in the editor restores only the current task’s starter code and keeps that task marked as completed.",
  },
  {
    question: "Why does the preview sometimes take a moment?",
    answer:
      "The app waits briefly while you type, then rebuilds the isolated preview. This avoids recompiling on every keystroke.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No. A modern browser is enough. The app is built as a static SPA, so it can run from GitHub Pages.",
  },
  {
    question: "Which course is included in version 1.0?",
    answer:
      "Version 1.0 includes HTML Essentials and CSS Essentials. More courses can be added later.",
  },
];

const stackIcons = {
  html: htmlIcon,
  css: cssIcon,
};

function LogoFrame({ stackId, active = false, children }) {
  return (
    <span
      className={`language-logo-frame ${active ? "active-icon " : ""}${stackId}-frame`}>
      {children}
    </span>
  );
}

function StackLogo({ stackId, active = false }) {
  const icon = stackIcons[stackId] ?? htmlIcon;

  return (
    <LogoFrame stackId={stackId} active={active}>
      <img
        className={`language-logo devicon-logo ${stackId}-logo`}
        src={icon}
        alt=""
        aria-hidden="true"
      />
    </LogoFrame>
  );
}

function Brand({ activeStackId, onStackChange }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const activeStack = stacks[activeStackId] ?? stacks[DEFAULT_STACK_ID];

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsidePointer = (event) => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const chooseStack = (id) => {
    setOpen(false);
    onStackChange(id);
  };

  return (
    <div className="language-selector" ref={pickerRef}>
      <button
        className="brand"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="stack-picker-menu"
        aria-label="Choose CodeTrail course">
        <StackLogo stackId={activeStackId} active />
        <span className="brand-copy">
          <b>CodeTrail</b>
          <span className="brand-stack-name">{activeStack.name}</span>
        </span>
        <ChevronDown
          className={`stack-picker-chevron ${open ? "rotated" : ""}`}
          size={15}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="stack-menu"
          id="stack-picker-menu"
          role="listbox"
          aria-label="Choose stack">
          {STACK_GROUPS.map((group) => (
            <section className="stack-menu-group" key={group.activity}>
              <p>{group.activity}</p>
              <div className="stack-menu-options">
                {group.stackIds.map((id) => {
                  const stack = stacks[id];
                  const selected = id === activeStackId;

                  return (
                    <button
                      className={`stack-option ${selected ? "active" : ""}`}
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => chooseStack(id)}>
                      <StackLogo stackId={id} active />
                      <span className="stack-option-copy">
                        <strong>{stack.name}</strong>
                        <small>{stack.description}</small>
                      </span>
                      {selected && (
                        <Check
                          className="stack-option-check"
                          size={15}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function GlobalResetButton({ onReset }) {
  return (
    <button
      className="nav-reset"
      onClick={onReset}
      aria-label="Reset all progress"
      title="Reset all progress and saved code">
      <RotateCcw size={16} />
    </button>
  );
}

function RedoTaskButton({ onRedo }) {
  return (
    <button
      className="task-redo"
      onClick={onRedo}
      aria-label="Redo this task"
      title="Restore this task’s starter code">
      <RotateCcw size={12} />
    </button>
  );
}

function ResetConfirmationModal({
  request,
  lessonTitle,
  trackName,
  onCancel,
  onConfirm,
}) {
  const isGlobalReset = request?.type === "all";
  const [canConfirm, setCanConfirm] = useState(!isGlobalReset);
  const [remaining, setRemaining] = useState(isGlobalReset ? 3 : 0);

  useEffect(() => {
    if (!request) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCancel, request]);

  useEffect(() => {
    if (!request || !isGlobalReset) return undefined;

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextRemaining = Math.max(
        0,
        Math.ceil((RESET_CONFIRM_DELAY_MS - elapsed) / 1000),
      );

      setRemaining(nextRemaining);

      if (elapsed >= RESET_CONFIRM_DELAY_MS) {
        setCanConfirm(true);
        window.clearInterval(interval);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [isGlobalReset, request]);

  if (!request) return null;

  const title = isGlobalReset ? "Reset all data?" : "Redo this task?";
  const description = isGlobalReset
    ? `This clears every completed challenge and every saved editor change in the ${trackName} course. You will return to the first lesson.`
    : `This restores the starter code for "${lessonTitle}". The task stays marked as completed if you already finished it.`;
  const confirmLabel = isGlobalReset ? "Reset all data" : "Redo task";

  return (
    <div
      className="confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}>
      <section
        className={isGlobalReset ? "confirm-dialog danger" : "confirm-dialog"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-confirm-title"
        aria-describedby="reset-confirm-description">
        <div className="confirm-icon">
          <RotateCcw size={18} />
        </div>
        <div className="confirm-copy">
          <span>{isGlobalReset ? "DESTRUCTIVE RESET" : "TASK RESET"}</span>
          <h2 id="reset-confirm-title">{title}</h2>
          <p id="reset-confirm-description">{description}</p>
        </div>

        {isGlobalReset && (
          <div className="confirm-wait">
            <div className="confirm-timer" aria-hidden="true">
              <i key={request.id} />
            </div>
          </div>
        )}

        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="confirm-reset"
            onClick={onConfirm}
            disabled={!canConfirm}>
            {canConfirm ? confirmLabel : `${remaining}s`}
          </button>
        </div>
      </section>
    </div>
  );
}

function Faq({ open, onToggle, onClose }) {
  const [expanded, setExpanded] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  return (
    <div className="faq-widget">
      {open && (
        <section
          className="faq-dialog"
          role="dialog"
          aria-modal="false"
          aria-labelledby="faq-title">
          <div className="faq-header">
            <div>
              <span>{APP_VERSION}</span>
              <h2 id="faq-title">Frequently asked questions</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close frequently asked questions">
              <X size={18} />
            </button>
          </div>
          <div className="faq-list">
            {faqItems.map((item, index) => {
              const isExpanded = expanded === index;
              return (
                <div className="faq-item" key={item.question}>
                  <button
                    aria-expanded={isExpanded}
                    onClick={() => setExpanded(isExpanded ? -1 : index)}>
                    <span>{item.question}</span>
                    <ChevronDown
                      className={isExpanded ? "rotated" : ""}
                      size={16}
                    />
                  </button>
                  {isExpanded && <p>{item.answer}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}
      <button
        className="faq-trigger"
        onClick={onToggle}
        aria-label={open ? "Close FAQ" : "Open FAQ"}
        aria-expanded={open}>
        {open ? <X size={20} /> : "?"}
      </button>
    </div>
  );
}

function createEmptyProgress() {
  return {
    completed: [],
    code: {},
    lastLanguage: DEFAULT_STACK_ID,
    lastLesson: {},
  };
}

function isKnownLessonId(id) {
  return (
    typeof id === "string" &&
    STACK_PREFIXES.some((prefix) => id.startsWith(prefix))
  );
}

function stackIdFromLessonId(id) {
  return stackIds.find((stackId) => id?.startsWith(`${stackId}-`)) ?? null;
}

function normalizeProgress(progress) {
  const base = progress && typeof progress === "object" ? progress : {};
  const completed = Array.isArray(base.completed)
    ? [
        ...new Set(
          base.completed.filter((id) => isKnownLessonId(id)),
        ),
      ]
    : [];
  const codeEntries = Object.entries(base.code ?? {}).filter(
    ([id, code]) => isKnownLessonId(id) && typeof code === "string",
  );
  const lastLanguage = stackIds.includes(base.lastLanguage)
    ? base.lastLanguage
    : DEFAULT_STACK_ID;
  const lastLesson = {};

  if (typeof base.lastLesson === "object" && base.lastLesson !== null) {
    for (const [stackId, lessonId] of Object.entries(base.lastLesson)) {
      if (
        stackIds.includes(stackId) &&
        typeof lessonId === "string" &&
        lessonId.startsWith(`${stackId}-`)
      ) {
        lastLesson[stackId] = lessonId;
      }
    }
  } else if (typeof base.lastLesson === "string") {
    const stackId = stackIdFromLessonId(base.lastLesson);
    if (stackId) lastLesson[stackId] = base.lastLesson;
  }

  return {
    completed,
    code: Object.fromEntries(codeEntries),
    lastLanguage,
    lastLesson,
  };
}

function getSavedProgress() {
  if (typeof localStorage === "undefined") return createEmptyProgress();

  try {
    const saved = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]
      .map((key) => localStorage.getItem(key))
      .find(Boolean);
    if (!saved) return createEmptyProgress();

    return normalizeProgress(JSON.parse(saved) ?? createEmptyProgress());
  } catch {
    return createEmptyProgress();
  }
}

function TaskBrief({ lesson, results, showHint, onToggleHint, hintRef }) {
  return (
    <div className="objective-card">
      <div className="task-section">
        <span>WHAT TO DO</span>
        <p>{lesson.objective}</p>
      </div>
      <div className="task-section task-requirements">
        <div className="requirement-heading">
          <span>YOUR CODE MUST</span>
          <strong>
            {results.filter((result) => result.passed).length}/{results.length}
          </strong>
        </div>
        <ul className="requirement-list">
          {results.map((result) => (
            <li
              className={result.passed ? "requirement-item passed" : "requirement-item"}
              key={result.label}>
              {result.passed ? <Check size={15} /> : <Circle size={13} />}
              <span>{result.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="task-section hint-section">
        <button className="hint-button" onClick={onToggleHint}>
          <Lightbulb size={17} />
          {showHint ? "Hide hint" : "Need a hint?"}
        </button>
        {showHint && (
          <p className="hint-copy" ref={hintRef}>
            {lesson.hint}
          </p>
        )}
      </div>
    </div>
  );
}

function LessonWorkspace({
  lesson,
  onCodeChange,
  onComplete,
  onNext,
  onRedo,
  isCompleted,
  trackName,
}) {
  const { code } = useActiveCode();
  const [showHint, setShowHint] = useState(false);
  const hintRef = useRef(null);
  const results = useMemo(
    () =>
      lesson.checks.map((check) => ({ ...check, passed: check.test(code) })),
    [code, lesson],
  );
  const allPassed = results.every((result) => result.passed);

  useEffect(() => {
    const timeout = setTimeout(() => onCodeChange(code), 250);
    return () => clearTimeout(timeout);
  }, [code, onCodeChange]);

  const toggleHint = () => {
    setShowHint((value) => {
      const nextValue = !value;
      if (nextValue) {
        requestAnimationFrame(() =>
          hintRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          }),
        );
      }
      return nextValue;
    });
  };

  return (
    <div className="workspace">
      <section className="lesson-panel">
        <div className="lesson-scroll">
          <p className="eyebrow">
            {lesson.eyebrow} · {lesson.number}
          </p>
          <h1>{lesson.title}</h1>
          <p className="lesson-summary">{lesson.summary}</p>

          <TaskBrief
            lesson={lesson}
            results={results}
            showHint={showHint}
            onToggleHint={toggleHint}
            hintRef={hintRef}
          />

          <div className="lesson-guidance">
            {lesson.commonMistake && (
              <div className="common-mistake">
                <span>COMMON MISTAKE</span>
                <p>{lesson.commonMistake}</p>
              </div>
            )}
            {lesson.bestPractice && (
              <div className="best-practice-card">
                <span>GOOD PRACTICE</span>
                <p>{lesson.bestPractice}</p>
              </div>
            )}
          </div>
        </div>

        <div className="lesson-action">
          {allPassed ? (
            <button
              className="complete-button"
              onClick={isCompleted ? onNext : onComplete}>
              {isCompleted ? "Next challenge" : "Complete challenge"}
              <ArrowRight size={18} />
            </button>
          ) : (
            <p>Complete every requirement to continue</p>
          )}
        </div>
      </section>

      <section className="code-panel">
        <div className="panel-bar">
          <div className="panel-title">
            <span className="status-dot" />{" "}
            {(lesson.file ?? "/index.html").slice(1)}
          </div>
          <RedoTaskButton onRedo={onRedo} />
        </div>
        <SandpackCodeEditor
          showTabs={false}
          showLineNumbers
          wrapContent
          closableTabs={false}
        />
      </section>

      <section className="preview-panel">
        <div className="panel-bar">
          <div className="panel-title">
            <span className="status-dot preview-dot" /> {trackName} preview
          </div>
          <span className="live-label">LIVE</span>
        </div>
        <SandpackPreview
          showNavigator={false}
          showRefreshButton={false}
          showRestartButton={false}
          showOpenInCodeSandbox={false}
        />
      </section>
    </div>
  );
}

export default function App() {
  const [progress, setProgress] = useState(() => getSavedProgress());
  const [activeStackId, setActiveStackId] = useState(() => {
    const savedProgress = getSavedProgress();
    return stackIds.includes(savedProgress.lastLanguage)
      ? savedProgress.lastLanguage
      : DEFAULT_STACK_ID;
  });
  const [loadedTracks, setLoadedTracks] = useState({});
  const [trackLoadError, setTrackLoadError] = useState(null);
  const [activeId, setActiveId] = useState(() => {
    const savedProgress = getSavedProgress();
    const savedStackId = stackIds.includes(savedProgress.lastLanguage)
      ? savedProgress.lastLanguage
      : DEFAULT_STACK_ID;
    return savedProgress.lastLesson?.[savedStackId] ?? null;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [resetRequest, setResetRequest] = useState(null);
  const [sandboxRevision, setSandboxRevision] = useState(0);

  const track = loadedTracks[activeStackId] ?? stacks[activeStackId];
  const trackLessons = track.lessons ?? EMPTY_LESSONS;
  const trackName = track.name;
  const activeLessonId = trackLessons.some((item) => item.id === activeId)
    ? activeId
    : null;
  const savedLessonId = trackLessons.some(
    (item) => item.id === progress.lastLesson?.[activeStackId],
  )
    ? progress.lastLesson[activeStackId]
    : null;
  const requestedLessonId = activeLessonId ?? savedLessonId;
  const requestedLesson = trackLessons.length
    ? (trackLessons.find((item) => item.id === requestedLessonId) ??
      trackLessons[0])
    : null;
  const requestedLessonIndex = requestedLesson
    ? trackLessons.findIndex((item) => item.id === requestedLesson.id)
    : -1;
  const fallbackLessonId = trackLessons.length
    ? firstAvailableLessonId(trackLessons, progress.completed)
    : null;
  const lesson =
    requestedLesson &&
    isLessonUnlocked(trackLessons, progress.completed, requestedLessonIndex)
      ? requestedLesson
      : (trackLessons.find((item) => item.id === fallbackLessonId) ??
        trackLessons[0] ??
        null);
  const lessonIndex = lesson
    ? trackLessons.findIndex((item) => item.id === lesson.id)
    : -1;
  const completedInTrack = trackLessons.filter((item) =>
    progress.completed.includes(item.id),
  ).length;
  const percentage = trackLessons.length
    ? Math.round((completedInTrack / trackLessons.length) * 100)
    : 0;
  const sandboxKey = lesson
    ? `${activeStackId}:${lesson.id}:${sandboxRevision}`
    : `${activeStackId}:loading:${sandboxRevision}`;
  const requestedSandboxCode = lesson
    ? (progress.code[lesson.id] ?? lesson.code)
    : "";
  const sandboxCode = requestedSandboxCode;

  useEffect(() => {
    let active = true;

    loadStack(activeStackId)
      .then((loaded) => {
        if (!active) return;
        setLoadedTracks((current) =>
          current[activeStackId] === loaded
            ? current
            : { ...current, [activeStackId]: loaded },
        );
        setTrackLoadError(null);
      })
      .catch((error) => {
        if (!active) return;
        setTrackLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load this course.",
        );
      });

    return () => {
      active = false;
    };
  }, [activeStackId]);

  useEffect(() => {
    let active = true;

    Promise.allSettled(
      stackIds.map(async (id) => [id, await loadStack(id)]),
    ).then((results) => {
      if (!active) return;

      setLoadedTracks((current) => {
        let next = current;

        for (const result of results) {
          if (result.status !== "fulfilled") continue;

          const [id, loaded] = result.value;
          if (next[id] === loaded) continue;

          if (next === current) next = { ...current };
          next[id] = loaded;
        }

        return next;
      });
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!lesson || typeof localStorage === "undefined") return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...normalizeProgress(progress),
        lastLanguage: activeStackId,
        lastLesson: {
          ...normalizeProgress(progress).lastLesson,
          [activeStackId]: lesson.id,
        },
      }),
    );
  }, [activeStackId, progress, lesson]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [sidebarOpen]);

  const selectLesson = (id) => {
    const lessonItemIndex = trackLessons.findIndex((item) => item.id === id);
    if (
      lessonItemIndex < 0 ||
      !isLessonUnlocked(trackLessons, progress.completed, lessonItemIndex)
    )
      return;
    setActiveId(id);
    setSidebarOpen(false);
  };

  const selectStack = (id) => {
    if (!stackIds.includes(id) || id === activeStackId) return;
    const savedProgress = getSavedProgress();
    setTrackLoadError(null);
    setActiveStackId(id);
    setActiveId(savedProgress.lastLesson?.[id] ?? null);
    setSidebarOpen(false);
    setFaqOpen(false);
    setSandboxRevision((value) => value + 1);
  };

  const saveCode = (code) => {
    if (!lesson) return;

    setProgress((current) => {
      if (current.code[lesson.id] === code) return current;
      return { ...current, code: { ...current.code, [lesson.id]: code } };
    });
  };

  const nextLesson = () => {
    if (!trackLessons.length || lessonIndex < 0) return;
    selectLesson(trackLessons[(lessonIndex + 1) % trackLessons.length].id);
  };

  const completeLesson = () => {
    if (!lesson) return;

    setProgress((current) =>
      current.completed.includes(lesson.id)
        ? current
        : { ...current, completed: [...current.completed, lesson.id] },
    );
    if (lessonIndex < trackLessons.length - 1) {
      const nextLessonId = trackLessons[lessonIndex + 1].id;
      setTimeout(() => setActiveId(nextLessonId), 350);
    }
  };

  const requestReset = (type) => {
    setFaqOpen(false);
    setSidebarOpen(false);
    setResetRequest({ type, id: `${type}-${Date.now()}` });
  };

  const redoLesson = () => {
    if (!lesson) return;

    setProgress((current) => redoLessonProgress(current, lesson.id));
    setSandboxRevision((value) => value + 1);
  };

  const resetEverything = () => {
    setProgress((current) => normalizeProgress(resetAllProgress(current)));
    setActiveId(trackLessons[0]?.id ?? null);
    setSandboxRevision((value) => value + 1);
  };

  const confirmResetRequest = () => {
    if (!resetRequest) return;

    if (resetRequest.type === "all") resetEverything();
    if (resetRequest.type === "redo") redoLesson();

    setResetRequest(null);
  };

  const files = useMemo(() => {
    if (!lesson) {
      return {
        "/index.html": `<main><p>Loading ${trackName} lesson...</p></main>`,
        "/styles.css": PREVIEW_BASE_STYLES,
        "/index.js": EMPTY_PREVIEW_SCRIPT,
      };
    }

    if (lesson.files) {
      return {
        ...lesson.files,
        [lesson.file ?? "/index.html"]: sandboxCode,
      };
    }

    return {
      "/index.html": sandboxCode,
      "/styles.css": PREVIEW_BASE_STYLES,
      "/index.js": EMPTY_PREVIEW_SCRIPT,
    };
  }, [lesson, sandboxCode, trackName]);

  const groups = [...new Set(trackLessons.map((item) => item.group))];

  if (!lesson) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand-cell">
            <Brand
              activeStackId={activeStackId}
              onStackChange={selectStack}
            />
          </div>
          <div className="top-progress">
            <span>
              {trackLoadError
                ? "Course failed to load"
                : `Loading ${trackName} lessons`}
            </span>
            <div className="progress-track">
              <i style={{ width: trackLoadError ? "100%" : "42%" }} />
            </div>
            <strong>{trackLoadError ? "!" : "..."}</strong>
          </div>
          <GlobalResetButton onReset={() => requestReset("all")} />
        </header>
        <main className="main-area loading-state">
          <section>
            <span>{trackLoadError ? "LOAD ERROR" : "LOADING COURSE"}</span>
            <h1>
              {trackLoadError
                ? `Unable to load the ${trackName} course.`
                : `Preparing ${trackName}`}
            </h1>
            <p>
              {trackLoadError ??
                `The ${trackName} lessons and requirements are being loaded.`}
            </p>
          </section>
        </main>
        {resetRequest && (
          <ResetConfirmationModal
            key={resetRequest.id}
            request={resetRequest}
            lessonTitle="current progress"
            trackName={trackName}
            onCancel={() => setResetRequest(null)}
            onConfirm={confirmResetRequest}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="mobile-menu"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open lessons">
          <Menu />
        </button>
        <div className="brand-cell">
          <Brand
            activeStackId={activeStackId}
            onStackChange={selectStack}
          />
          <button
            className="desktop-sidebar-toggle"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label={
              sidebarOpen ? "Hide course lessons" : "Show course lessons"
            }
            title={sidebarOpen ? "Hide course lessons" : "Show course lessons"}>
            {sidebarOpen ? (
              <PanelLeftClose size={18} />
            ) : (
              <PanelLeftOpen size={18} />
            )}
          </button>
        </div>
        <div className="top-progress">
          <span>
            {completedInTrack} of {trackLessons.length} complete
          </span>
          <div className="progress-track">
            <i style={{ width: `${percentage}%` }} />
          </div>
          <strong>{percentage}%</strong>
        </div>
        <GlobalResetButton onReset={() => requestReset("all")} />
      </header>

      <div className="body-grid">
        {sidebarOpen && (
          <button
            className="sidebar-scrim"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close lessons"
          />
        )}
        <aside className={sidebarOpen ? "sidebar open" : "sidebar"}>
          <div className="sidebar-heading">
            <div>
              <h2>{trackName} essentials course</h2>
            </div>
            <button
              className="close-menu"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close lessons">
              <X />
            </button>
          </div>
          <nav>
            {groups.map((group) => (
              <div className="lesson-group" key={group}>
                <p>{group}</p>
                {trackLessons
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const completed = progress.completed.includes(item.id);
                    const itemIndex = trackLessons.findIndex(
                      (lessonItem) => lessonItem.id === item.id,
                    );
                    const unlocked = isLessonUnlocked(
                      trackLessons,
                      progress.completed,
                      itemIndex,
                    );
                    return (
                      <button
                        className={`${item.id === lesson.id ? "active " : ""}${completed ? "completed " : ""}${unlocked ? "" : "locked"}`}
                        onClick={() => selectLesson(item.id)}
                        disabled={!unlocked}
                        title={
                          unlocked
                            ? item.title
                            : "Complete the previous lessons to unlock this challenge"
                        }
                        key={item.id}>
                        <span className="lesson-number">
                          {completed ? (
                            <Check size={14} />
                          ) : unlocked ? (
                            item.number
                          ) : (
                            <Lock size={12} />
                          )}
                        </span>
                        <span>
                          <b>{item.title}</b>
                          <small>{item.eyebrow}</small>
                        </span>
                      </button>
                    );
                  })}
              </div>
            ))}
          </nav>
        </aside>

        <main className="main-area">
          <SandpackProvider
            className="sandbox-root"
            key={sandboxKey}
            template="vanilla"
            files={files}
            theme={SANDPACK_THEME}
            options={{
              activeFile: lesson.file ?? "/index.html",
              visibleFiles: [lesson.file ?? "/index.html"],
              autorun: true,
              autoReload: true,
              recompileMode: "delayed",
              recompileDelay: 1000,
            }}>
            <SandpackLayout>
              <LessonWorkspace
                lesson={lesson}
                trackName={trackName}
                onCodeChange={saveCode}
                onComplete={completeLesson}
                onNext={nextLesson}
                onRedo={() => requestReset("redo")}
                isCompleted={progress.completed.includes(lesson.id)}
              />
            </SandpackLayout>
          </SandpackProvider>
        </main>
      </div>

      {resetRequest && (
        <ResetConfirmationModal
          key={resetRequest.id}
          request={resetRequest}
          lessonTitle={lesson.title}
          trackName={trackName}
          onCancel={() => setResetRequest(null)}
          onConfirm={confirmResetRequest}
        />
      )}
      <Faq
        open={faqOpen}
        onToggle={() => setFaqOpen((value) => !value)}
        onClose={() => setFaqOpen(false)}
      />
    </div>
  );
}
