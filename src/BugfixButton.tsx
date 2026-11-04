import { useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { configErrors, loadSavedConfig, saveConfig } from "./config.js";
import type { FeedbackConfig } from "./config.js";
import { buildIssueUrl } from "./issueUrl.js";
import { CLAIM_LABEL, PARKED_LABEL, renderRoutinePrompt } from "./routinePrompt.js";
import { styles } from "./styles.js";

// Injected by the Vite plugin.
declare const __BUGFIX_BUTTON_REPO__: string | null | undefined;

const DRAFT_KEY = "bugfix-button:draft";
const DEFAULT_LABEL = "feedback";

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
  /** "top-right" floats the button; "inline" flows in a header. */
  placement?: "top-right" | "inline";
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

export function BugfixButton(props: BugfixButtonProps) {
  const [open, setOpen] = useState(false);
  const placement = props.placement ?? "top-right";
  const buttonStyle: CSSProperties = placement === "top-right"
    ? { ...styles.button, ...styles.floating }
    : styles.button;

  return (
    <>
      <button
        type="button"
        style={buttonStyle}
        onClick={() => setOpen(true)}
        title="Report a bug or request a feature"
      >
        🐞 Feedback
      </button>
      {open && <FeedbackModal {...props} onClose={() => setOpen(false)} />}
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
    body = (
      <FileView
        config={config}
        appName={props.appName ?? document.title}
        onSettings={() => setView("routine")}
        onClose={onClose}
      />
    );
  }

  return (
    <div style={styles.overlay} onKeyDown={handleKeyDown}>
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

function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(text: string): void {
  try {
    if (text) localStorage.setItem(DRAFT_KEY, text);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage blocked; keep draft in memory.
  }
}

interface FileViewProps {
  config: FeedbackConfig;
  appName: string;
  onSettings: () => void;
  onClose: () => void;
}

function FileView({ config, appName, onSettings, onClose }: FileViewProps) {
  const [description, setDescription] = useState(readDraft);

  const updateDescription = (text: string) => {
    setDescription(text);
    writeDraft(text);
  };

  const openIssue = () => {
    if (!description.trim()) return;
    const url = buildIssueUrl(config, description, window.location.href, appName);
    window.open(url, "_blank", "noopener,noreferrer");
    writeDraft("");
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") openIssue();
  };

  return (
    <>
      <textarea
        style={styles.textarea}
        placeholder="Describe the bug or request. The first line becomes the issue title."
        value={description}
        onChange={(e) => updateDescription(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={7}
        autoFocus
      />
      <div style={styles.footer}>
        <button type="button" style={styles.linkButton} onClick={onSettings}>
          ⚙ {config.repo}
        </button>
        <div style={styles.actions}>
          <button type="button" style={styles.secondary} onClick={onClose}>Cancel</button>
          <button
            type="button"
            style={styles.primary}
            onClick={openIssue}
            disabled={!description.trim()}
          >
            Open Issue →
          </button>
        </div>
      </div>
      <span style={styles.hint}>⌘↵ to open · paste screenshots into the GitHub issue</span>
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
  const [label, setLabel] = useState(initial ? (initial.labels[0] ?? "") : DEFAULT_LABEL);

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
  const labels = [...config.labels.slice(0, 1), CLAIM_LABEL, PARKED_LABEL];

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
        <li>
          Create labels {labels.map((l, i) => <span key={l}>{i > 0 && ", "}<code>{l}</code></span>)} in{" "}
          <a href={`https://github.com/${config.repo}/labels`} target="_blank" rel="noreferrer">{config.repo}</a>.
        </li>
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
