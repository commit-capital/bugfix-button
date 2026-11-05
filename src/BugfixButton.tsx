import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { createPortal } from "react-dom";
import { configErrors, loadSavedConfig, saveConfig } from "./config.js";
import type { FeedbackConfig } from "./config.js";
import { buildIssueUrl, issueTitle } from "./issueUrl.js";
import type { IssueDraft } from "./issueUrl.js";
import { renderRoutinePrompt } from "./routinePrompt.js";
import type { AfterFix } from "./routinePrompt.js";
import { copyPageScreenshot, SCREENSHOT_SKIP_ATTR } from "./screenshot.js";
import { renderSetupKit, SETUP_COMMAND } from "./setupKit.js";
import type { RepoSetup } from "./setupKit.js";
import { useSpeechInput } from "./speech.js";
import { styles } from "./styles.js";

// Injected by the Vite plugin.
declare const __BUGFIX_BUTTON_REPO__: string | null | undefined;
declare const __BUGFIX_BUTTON_SETUP__: RepoSetup | null | undefined;

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
        🐞 File a Bug
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

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
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
        <button type="button" style={styles.settings} onClick={onSettings} title="Repository and auto-fix settings">
          <GearIcon /> {config.repo}
        </button>
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
        <span style={styles.hint}>The label must already exist in the repository.</span>
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

const ROUTINE_KEY = "bugfix-button:routine";

interface RoutineRules {
  filedBy: string;
  assignee: string;
  afterFix: AfterFix;
}

function loadRules(config: FeedbackConfig): RoutineRules {
  const defaults: RoutineRules = { filedBy: config.filedBy ?? "", assignee: config.assignee ?? "", afterFix: "merge" };
  const raw = readPref(ROUTINE_KEY);
  if (!raw) return defaults;
  try {
    const saved: unknown = JSON.parse(raw);
    if (typeof saved !== "object" || saved === null) return defaults;
    const v = saved as Record<string, unknown>;
    if (v.repo !== config.repo || typeof v.filedBy !== "string" || typeof v.assignee !== "string") return defaults;
    return { filedBy: v.filedBy, assignee: v.assignee, afterFix: v.afterFix === "review" ? "review" : "merge" };
  } catch {
    return defaults;
  }
}

function detectedSetup(): RepoSetup | null {
  return typeof __BUGFIX_BUTTON_SETUP__ === "object" ? __BUGFIX_BUTTON_SETUP__ ?? null : null;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" style={styles.secondary} onClick={() => void copy()}>
      {copied ? "Copied ✓" : label}
    </button>
  );
}

function RoutineView({ config, editable, onEdit, onDone }: RoutineViewProps) {
  const [rules, setRules] = useState<RoutineRules>(() => loadRules(config));
  const setup = detectedSetup();

  const update = (next: Partial<RoutineRules>) => {
    const merged = { ...rules, ...next };
    setRules(merged);
    writePref(ROUTINE_KEY, JSON.stringify({ repo: config.repo, ...merged }));
  };

  const routineConfig: FeedbackConfig = {
    ...config,
    filedBy: rules.filedBy.trim() || null,
    assignee: rules.assignee.trim() || null,
  };
  // An unscoped prompt would fix strangers' issues.
  const errors = configErrors(routineConfig);
  const prompt = renderRoutinePrompt(routineConfig, rules.afterFix);

  return (
    <>
      <p style={styles.instructions}>
        Your auto-fix routine for <code>{config.repo}</code>. Each person sets up their own.
      </p>
      <label style={styles.field}>
        <span>Fix issues filed by (GitHub login)</span>
        <input style={styles.input} value={rules.filedBy} onChange={(e) => update({ filedBy: e.target.value })} placeholder="anyone" />
      </label>
      <label style={styles.field}>
        <span>and assigned to</span>
        <input style={styles.input} value={rules.assignee} onChange={(e) => update({ assignee: e.target.value })} placeholder="anyone" />
      </label>
      <div style={styles.field} role="radiogroup" aria-label="When a fix passes its checks">
        <span>When a fix passes its checks</span>
        <label style={styles.option}>
          <input type="radio" checked={rules.afterFix === "merge"} onChange={() => update({ afterFix: "merge" })} />
          Merge it
        </label>
        <label style={styles.option}>
          <input type="radio" checked={rules.afterFix === "review"} onChange={() => update({ afterFix: "review" })} />
          Open a PR for my review
        </label>
      </div>
      {errors.length > 0 ? (
        <ul style={styles.errors}>{errors.map((err) => <li key={err}>{err}</li>)}</ul>
      ) : (
        <>
          <p style={styles.sectionTitle}>1. Prepare the agent's environment</p>
          {setup ? (
            <>
              <p style={styles.hint}>Detected from this repository:</p>
              <textarea style={styles.code} value={renderSetupKit(setup)} readOnly rows={6} wrap="off" />
              <div style={styles.actions}><CopyButton text={renderSetupKit(setup)} label="Copy setup" /></div>
            </>
          ) : (
            <p style={styles.hint}>
              Run <code>{SETUP_COMMAND}</code> in your repository. It prints the setup script,
              the domains to allow, and the checks the agent must be able to run.
            </p>
          )}
          <p style={styles.sectionTitle}>2. Create the task</p>
          <p style={styles.instructions}>
            In any AI agent that can run a task on a GitHub event (Claude Code, Codex, …), create a task
            for <code>{config.repo}</code> that runs on <b>issue opened</b>, with this prompt:
          </p>
          <textarea style={styles.code} value={prompt} readOnly rows={8} wrap="off" />
        </>
      )}
      <div style={styles.footer}>
        {editable
          ? <button type="button" style={styles.linkButton} onClick={onEdit}>Edit where issues go</button>
          : <span />}
        <div style={styles.actions}>
          {errors.length === 0 && <CopyButton text={prompt} label="Copy prompt" />}
          <button type="button" style={styles.primary} onClick={onDone}>Done</button>
        </div>
      </div>
    </>
  );
}
