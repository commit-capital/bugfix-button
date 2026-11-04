import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { createPortal } from "react-dom";
import { configErrors, loadSavedConfig, saveConfig } from "./config.js";
import type { FeedbackConfig } from "./config.js";
import { buildIssueUrl, issueTitle } from "./issueUrl.js";
import type { IssueDraft } from "./issueUrl.js";
import { renderRoutinePrompt } from "./routinePrompt.js";
import { copyPageScreenshot, SCREENSHOT_SKIP_ATTR } from "./screenshot.js";
import { useSpeechInput } from "./speech.js";
import { styles } from "./styles.js";

// Injected by the Vite plugin.
declare const __BUGFIX_BUTTON_REPO__: string | null | undefined;

const DRAFT_KEY = "bugfix-button:draft";
const MIC_KEY = "bugfix-button:mic";
const SCREENSHOT_KEY = "bugfix-button:screenshot";
/** Longest wait for `generate` before filing raw. */
export const GENERATE_TIMEOUT_MS = 12000;

export interface BugfixButtonProps {
  /** "owner/name". Omit to configure in the browser. */
  repo?: string;
  /** Routine rule: fix only issues this login filed. */
  filedBy?: string;
  /** Prefilled assignee; the routine requires it. */
  assignee?: string;
  /** Prefilled labels; the routine requires the first. */
  labels?: string[];
  /** Names the app in the issue footer. */
  appName?: string;
  /** Extra footer facts, such as a git branch. */
  details?: string[];
  /** Turns the raw description into a title and body. */
  generate?: (description: string) => Promise<IssueDraft>;
  /** "top-right" floats the button; "inline" flows in a header. */
  placement?: "top-right" | "inline";
  /** Replaces the button's built-in styles. */
  buttonClassName?: string;
}

type View = "file" | "setup" | "routine";

function detectedRepo(): string | null {
  return typeof __BUGFIX_BUTTON_REPO__ === "string" ? __BUGFIX_BUTTON_REPO__ : null;
}

function configFromProps(props: BugfixButtonProps): FeedbackConfig | null {
  if (!props.repo) return null;
  return {
    repo: props.repo,
    filedBy: props.filedBy ?? null,
    assignee: props.assignee ?? null,
    labels: props.labels ?? [],
  };
}

function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePref(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Storage blocked; keep state in memory.
  }
}

export function BugfixButton(props: BugfixButtonProps) {
  const [open, setOpen] = useState(false);
  let buttonStyle: CSSProperties | undefined;
  if (!props.buttonClassName) {
    buttonStyle = (props.placement ?? "top-right") === "top-right"
      ? { ...styles.button, ...styles.floating }
      : styles.button;
  }

  return (
    <>
      <button
        type="button"
        className={props.buttonClassName}
        style={buttonStyle}
        onClick={() => setOpen(true)}
        title="Report a bug or request a feature"
      >
        🐞 Feedback
      </button>
      {/* A sticky header's stacking context would cap the overlay. */}
      {open && createPortal(<FeedbackModal {...props} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

interface FeedbackModalProps extends BugfixButtonProps {
  onClose: () => void;
}

function FeedbackModal({ onClose, ...props }: FeedbackModalProps) {
  const fixedConfig = configFromProps(props);
  const [config, setConfig] = useState<FeedbackConfig | null>(() => fixedConfig ?? loadSavedConfig());
  const [view, setView] = useState<View>(config ? "file" : "setup");

  // Dismiss only when the press began on the backdrop.
  const pressStartedOnOverlay = useRef(false);
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    pressStartedOnOverlay.current = e.target === e.currentTarget;
  };
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && pressStartedOnOverlay.current) onClose();
  };
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  let body;
  if (view === "setup" || !config) {
    body = (
      <SetupView
        initial={config}
        onSave={(next) => {
          saveConfig(next);
          setConfig(next);
          setView("routine");
        }}
      />
    );
  } else if (view === "routine") {
    body = (
      <RoutineView
        config={config}
        editable={fixedConfig === null}
        onEdit={() => setView("setup")}
        onDone={() => setView("file")}
      />
    );
  } else {
    body = <FileView {...props} config={config} onSettings={() => setView("routine")} onClose={onClose} />;
  }

  return (
    <div
      style={styles.overlay}
      {...{ [SCREENSHOT_SKIP_ATTR]: "" }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div style={styles.modal} role="dialog" aria-modal="true" aria-label="File a bug or feature request">
        <div style={styles.modalHeader}>
          <span>🐞 {view === "file" ? "File a bug or request" : "Set up the bug button"}</span>
          <button type="button" style={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </div>
        {body}
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
    </svg>
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timed out")), ms);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error: unknown) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

interface FileViewProps extends BugfixButtonProps {
  config: FeedbackConfig;
  onSettings: () => void;
  onClose: () => void;
}

type Phase = "screenshot" | "generating" | null;

function FileView({ config, appName, details, generate, onSettings, onClose }: FileViewProps) {
  const [description, setDescription] = useState(() => readPref(DRAFT_KEY) ?? "");
  const [phase, setPhase] = useState<Phase>(null);
  const [screenshot, setScreenshot] = useState(() => readPref(SCREENSHOT_KEY) !== "false");
  const [clipOk, setClipOk] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const speech = useSpeechInput(
    (text) => setDescription((prev) => (prev ? `${prev} ${text}` : text)),
    readPref(MIC_KEY) === "true",
  );
  const busy = phase !== null;

  useEffect(() => { writePref(MIC_KEY, String(speech.active)); }, [speech.active]);
  useEffect(() => { writePref(DRAFT_KEY, description); }, [description]);

  const toggleScreenshot = () => {
    setScreenshot(!screenshot);
    writePref(SCREENSHOT_KEY, String(!screenshot));
  };

  const openIssue = async () => {
    const raw = description.trim();
    if (!raw || busy) return;
    // Open inside the click so popup blockers allow it.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    speech.stop();
    setClipOk(null);
    setPreview(null);

    let copied = false;
    if (screenshot) {
      setPhase("screenshot");
      const shot = await copyPageScreenshot();
      copied = shot.copied;
      setClipOk(shot.copied);
      setPreview(shot.preview);
    }

    let issue: IssueDraft = { title: issueTitle(raw), body: raw };
    if (generate) {
      setPhase("generating");
      try {
        const result = await withTimeout(generate(raw), GENERATE_TIMEOUT_MS);
        issue = { title: result.title || issue.title, body: result.body || issue.body };
      } catch {
        // File the raw description.
      }
    }

    const url = buildIssueUrl(config, issue, {
      appName: appName ?? document.title,
      pageUrl: window.location.href,
      details: details ?? [],
    });
    if (tab) tab.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
    setDescription("");
    setPhase(null);
    // Stay open so a failed copy can be done by hand.
    if (!screenshot || copied) onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void openIssue();
  };

  let hint = "⌘↵ to open";
  if (phase === "screenshot") hint = "Taking screenshot…";
  else if (phase === "generating") hint = "Writing the issue…";
  else if (clipOk) hint = "📸 Screenshot copied; paste it into the issue";
  else if (clipOk === false && !preview) hint = "⚠️ Screenshot copy failed";

  if (preview) {
    return (
      <>
        <span style={styles.hint}>Couldn't copy the screenshot. Right-click it to copy:</span>
        <img src={preview} alt="Page screenshot" style={styles.preview} />
        <div style={styles.footer}>
          <span />
          <button type="button" style={styles.primary} onClick={onClose}>Done</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={styles.textareaWrap}>
        <textarea
          style={styles.textarea}
          placeholder={generate
            ? "Describe the bug or request. Claude writes the title and formats the issue."
            : "Describe the bug or request. The first line becomes the issue title."}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={7}
          autoFocus
          disabled={busy}
        />
        {speech.supported && (
          <button
            type="button"
            style={speech.active ? { ...styles.mic, ...styles.micActive } : styles.mic}
            onClick={speech.toggle}
            title={speech.active ? "Stop voice input" : "Start voice input"}
            aria-label={speech.active ? "Stop voice input" : "Start voice input"}
            disabled={busy}
          >
            <MicIcon />
          </button>
        )}
      </div>
      {speech.error && <span style={{ ...styles.hint, ...styles.errors }}>Mic error: {speech.error}</span>}
      <label style={styles.option}>
        <input type="checkbox" checked={screenshot} onChange={toggleScreenshot} disabled={busy} />
        Copy a screenshot to the clipboard
      </label>
      <div style={styles.footer}>
        <button type="button" style={styles.linkButton} onClick={onSettings}>⚙ {config.repo}</button>
        <div style={styles.actions}>
          <button type="button" style={styles.secondary} onClick={onClose} disabled={busy}>Cancel</button>
          <button
            type="button"
            style={styles.primary}
            onClick={() => void openIssue()}
            disabled={!description.trim() || busy}
          >
            {busy ? "Opening…" : "Open Issue →"}
          </button>
        </div>
      </div>
      <span style={styles.hint}>{hint}</span>
    </>
  );
}

interface SetupViewProps {
  initial: FeedbackConfig | null;
  onSave: (config: FeedbackConfig) => void;
}

function SetupView({ initial, onSave }: SetupViewProps) {
  const [repo, setRepo] = useState(initial?.repo ?? detectedRepo() ?? "");
  const [filedBy, setFiledBy] = useState(initial?.filedBy ?? "");
  const [assignee, setAssignee] = useState(initial?.assignee ?? "");
  const [label, setLabel] = useState(initial?.labels[0] ?? "");

  const draft: FeedbackConfig = {
    repo: repo.trim(),
    filedBy: filedBy.trim() || null,
    assignee: assignee.trim() || null,
    labels: label.trim() ? [label.trim()] : [],
  };
  const errors = configErrors(draft);

  return (
    <>
      <label style={styles.field}>
        <span>File issues in</span>
        <input style={styles.input} value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/name" autoFocus />
      </label>
      <p style={styles.hint}>Auto-fix an issue only when it matches every rule below.</p>
      <label style={styles.field}>
        <span>Filed by (GitHub login)</span>
        <input style={styles.input} value={filedBy} onChange={(e) => setFiledBy(e.target.value)} placeholder="anyone" />
      </label>
      <label style={styles.field}>
        <span>Assigned to</span>
        <input style={styles.input} value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="anyone" />
      </label>
      <label style={styles.field}>
        <span>With label</span>
        <input style={styles.input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="any" />
      </label>
      {errors.length > 0 && repo && (
        <ul style={styles.errors}>{errors.map((err) => <li key={err}>{err}</li>)}</ul>
      )}
      <div style={styles.footer}>
        <span />
        <button type="button" style={styles.primary} disabled={errors.length > 0} onClick={() => onSave(draft)}>
          Save →
        </button>
      </div>
    </>
  );
}

interface RoutineViewProps {
  config: FeedbackConfig;
  editable: boolean;
  onEdit: () => void;
  onDone: () => void;
}

function RoutineView({ config, editable, onEdit, onDone }: RoutineViewProps) {
  const [copied, setCopied] = useState(false);
  const prompt = renderRoutinePrompt(config);
  const label = config.labels[0];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <ol style={styles.steps}>
        {label && (
          <li>
            Create the label <code>{label}</code> in{" "}
            <a href={`https://github.com/${config.repo}/labels`} target="_blank" rel="noreferrer">{config.repo}</a>.
            GitHub drops a missing label from the issue link.
          </li>
        )}
        <li>
          In <a href="https://claude.ai/code" target="_blank" rel="noreferrer">Claude Code</a>, create a routine
          on <code>{config.repo}</code>, paste the prompt below, and trigger it on the GitHub event
          {" "}<b>issue opened</b>.
        </li>
      </ol>
      <textarea style={{ ...styles.textarea, fontFamily: "monospace", fontSize: 11 }} value={prompt} readOnly rows={10} />
      <div style={styles.footer}>
        {editable
          ? <button type="button" style={styles.linkButton} onClick={onEdit}>Edit rules</button>
          : <span style={styles.hint}>Rules come from props.</span>}
        <div style={styles.actions}>
          <button type="button" style={styles.secondary} onClick={() => void copy()}>
            {copied ? "Copied ✓" : "Copy prompt"}
          </button>
          <button type="button" style={styles.primary} onClick={onDone}>Done</button>
        </div>
      </div>
    </>
  );
}
