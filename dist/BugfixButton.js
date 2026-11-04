import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { configErrors, loadSavedConfig, saveConfig } from "./config.js";
import { buildIssueUrl, issueTitle } from "./issueUrl.js";
import { CLAIM_LABEL, PARKED_LABEL, renderRoutinePrompt } from "./routinePrompt.js";
import { copyPageScreenshot, SCREENSHOT_SKIP_ATTR } from "./screenshot.js";
import { useSpeechInput } from "./speech.js";
import { styles } from "./styles.js";
const DRAFT_KEY = "bugfix-button:draft";
const MIC_KEY = "bugfix-button:mic";
const SCREENSHOT_KEY = "bugfix-button:screenshot";
const DEFAULT_LABEL = "feedback";
/** Longest wait for `generate` before filing raw. */
export const GENERATE_TIMEOUT_MS = 12000;
function detectedRepo() {
    return typeof __BUGFIX_BUTTON_REPO__ === "string" ? __BUGFIX_BUTTON_REPO__ : null;
}
function configFromProps(props) {
    if (!props.repo)
        return null;
    return {
        repo: props.repo,
        filedBy: props.filedBy ?? null,
        assignee: props.assignee ?? null,
        labels: props.labels ?? [],
    };
}
function readPref(key) {
    try {
        return localStorage.getItem(key);
    }
    catch {
        return null;
    }
}
function writePref(key, value) {
    try {
        if (value)
            localStorage.setItem(key, value);
        else
            localStorage.removeItem(key);
    }
    catch {
        // Storage blocked; keep state in memory.
    }
}
export function BugfixButton(props) {
    const [open, setOpen] = useState(false);
    let buttonStyle;
    if (!props.buttonClassName) {
        buttonStyle = (props.placement ?? "top-right") === "top-right"
            ? { ...styles.button, ...styles.floating }
            : styles.button;
    }
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: props.buttonClassName, style: buttonStyle, onClick: () => setOpen(true), title: "Report a bug or request a feature", children: "\uD83D\uDC1E Feedback" }), open && createPortal(_jsx(FeedbackModal, { ...props, onClose: () => setOpen(false) }), document.body)] }));
}
function FeedbackModal({ onClose, ...props }) {
    const fixedConfig = configFromProps(props);
    const [config, setConfig] = useState(() => fixedConfig ?? loadSavedConfig());
    const [view, setView] = useState(config ? "file" : "setup");
    // Dismiss only when the press began on the backdrop.
    const pressStartedOnOverlay = useRef(false);
    const handleMouseDown = (e) => {
        pressStartedOnOverlay.current = e.target === e.currentTarget;
    };
    const handleClick = (e) => {
        if (e.target === e.currentTarget && pressStartedOnOverlay.current)
            onClose();
    };
    const handleKeyDown = (e) => {
        if (e.key === "Escape")
            onClose();
    };
    let body;
    if (view === "setup" || !config) {
        body = (_jsx(SetupView, { initial: config, onSave: (next) => {
                saveConfig(next);
                setConfig(next);
                setView("routine");
            } }));
    }
    else if (view === "routine") {
        body = (_jsx(RoutineView, { config: config, editable: fixedConfig === null, onEdit: () => setView("setup"), onDone: () => setView("file") }));
    }
    else {
        body = _jsx(FileView, { ...props, config: config, onSettings: () => setView("routine"), onClose: onClose });
    }
    return (_jsx("div", { style: styles.overlay, [SCREENSHOT_SKIP_ATTR]: "", onMouseDown: handleMouseDown, onClick: handleClick, onKeyDown: handleKeyDown, children: _jsxs("div", { style: styles.modal, role: "dialog", "aria-modal": "true", "aria-label": "File a bug or feature request", children: [_jsxs("div", { style: styles.modalHeader, children: [_jsxs("span", { children: ["\uD83D\uDC1E ", view === "file" ? "File a bug or request" : "Set up the bug button"] }), _jsx("button", { type: "button", style: styles.close, onClick: onClose, "aria-label": "Close", children: "\u2715" })] }), body] }) }));
}
function MicIcon() {
    return (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" }) }));
}
function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("timed out")), ms);
        promise.then((value) => { window.clearTimeout(timer); resolve(value); }, (error) => { window.clearTimeout(timer); reject(error); });
    });
}
function FileView({ config, appName, details, generate, onSettings, onClose }) {
    const [description, setDescription] = useState(() => readPref(DRAFT_KEY) ?? "");
    const [phase, setPhase] = useState(null);
    const [screenshot, setScreenshot] = useState(() => readPref(SCREENSHOT_KEY) !== "false");
    const [clipOk, setClipOk] = useState(null);
    const [preview, setPreview] = useState(null);
    const speech = useSpeechInput((text) => setDescription((prev) => (prev ? `${prev} ${text}` : text)), readPref(MIC_KEY) === "true");
    const busy = phase !== null;
    useEffect(() => { writePref(MIC_KEY, String(speech.active)); }, [speech.active]);
    useEffect(() => { writePref(DRAFT_KEY, description); }, [description]);
    const toggleScreenshot = () => {
        setScreenshot(!screenshot);
        writePref(SCREENSHOT_KEY, String(!screenshot));
    };
    const openIssue = async () => {
        const raw = description.trim();
        if (!raw || busy)
            return;
        // Open inside the click so popup blockers allow it.
        const tab = window.open("", "_blank");
        if (tab)
            tab.opener = null;
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
        let issue = { title: issueTitle(raw), body: raw };
        if (generate) {
            setPhase("generating");
            try {
                const result = await withTimeout(generate(raw), GENERATE_TIMEOUT_MS);
                issue = { title: result.title || issue.title, body: result.body || issue.body };
            }
            catch {
                // File the raw description.
            }
        }
        const url = buildIssueUrl(config, issue, {
            appName: appName ?? document.title,
            pageUrl: window.location.href,
            details: details ?? [],
        });
        if (tab)
            tab.location.href = url;
        else
            window.open(url, "_blank", "noopener,noreferrer");
        setDescription("");
        setPhase(null);
        // Stay open so a failed copy can be done by hand.
        if (!screenshot || copied)
            onClose();
    };
    const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter")
            void openIssue();
    };
    let hint = "⌘↵ to open";
    if (phase === "screenshot")
        hint = "Taking screenshot…";
    else if (phase === "generating")
        hint = "Writing the issue…";
    else if (clipOk)
        hint = "📸 Screenshot copied; paste it into the issue";
    else if (clipOk === false && !preview)
        hint = "⚠️ Screenshot copy failed";
    if (preview) {
        return (_jsxs(_Fragment, { children: [_jsx("span", { style: styles.hint, children: "Couldn't copy the screenshot. Right-click it to copy:" }), _jsx("img", { src: preview, alt: "Page screenshot", style: styles.preview }), _jsxs("div", { style: styles.footer, children: [_jsx("span", {}), _jsx("button", { type: "button", style: styles.primary, onClick: onClose, children: "Done" })] })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: styles.textareaWrap, children: [_jsx("textarea", { style: styles.textarea, placeholder: generate
                            ? "Describe the bug or request. Claude writes the title and formats the issue."
                            : "Describe the bug or request. The first line becomes the issue title.", value: description, onChange: (e) => setDescription(e.target.value), onKeyDown: handleKeyDown, rows: 7, autoFocus: true, disabled: busy }), speech.supported && (_jsx("button", { type: "button", style: speech.active ? { ...styles.mic, ...styles.micActive } : styles.mic, onClick: speech.toggle, title: speech.active ? "Stop voice input" : "Start voice input", "aria-label": speech.active ? "Stop voice input" : "Start voice input", disabled: busy, children: _jsx(MicIcon, {}) }))] }), speech.error && _jsxs("span", { style: { ...styles.hint, ...styles.errors }, children: ["Mic error: ", speech.error] }), _jsxs("label", { style: styles.option, children: [_jsx("input", { type: "checkbox", checked: screenshot, onChange: toggleScreenshot, disabled: busy }), "Copy a screenshot to the clipboard"] }), _jsxs("div", { style: styles.footer, children: [_jsxs("button", { type: "button", style: styles.linkButton, onClick: onSettings, children: ["\u2699 ", config.repo] }), _jsxs("div", { style: styles.actions, children: [_jsx("button", { type: "button", style: styles.secondary, onClick: onClose, disabled: busy, children: "Cancel" }), _jsx("button", { type: "button", style: styles.primary, onClick: () => void openIssue(), disabled: !description.trim() || busy, children: busy ? "Opening…" : "Open Issue →" })] })] }), _jsx("span", { style: styles.hint, children: hint })] }));
}
function SetupView({ initial, onSave }) {
    const [repo, setRepo] = useState(initial?.repo ?? detectedRepo() ?? "");
    const [filedBy, setFiledBy] = useState(initial?.filedBy ?? "");
    const [assignee, setAssignee] = useState(initial?.assignee ?? "");
    const [label, setLabel] = useState(initial ? (initial.labels[0] ?? "") : DEFAULT_LABEL);
    const draft = {
        repo: repo.trim(),
        filedBy: filedBy.trim() || null,
        assignee: assignee.trim() || null,
        labels: label.trim() ? [label.trim()] : [],
    };
    const errors = configErrors(draft);
    return (_jsxs(_Fragment, { children: [_jsxs("label", { style: styles.field, children: [_jsx("span", { children: "File issues in" }), _jsx("input", { style: styles.input, value: repo, onChange: (e) => setRepo(e.target.value), placeholder: "owner/name", autoFocus: true })] }), _jsx("p", { style: styles.hint, children: "Auto-fix an issue only when it matches every rule below." }), _jsxs("label", { style: styles.field, children: [_jsx("span", { children: "Filed by (GitHub login)" }), _jsx("input", { style: styles.input, value: filedBy, onChange: (e) => setFiledBy(e.target.value), placeholder: "anyone" })] }), _jsxs("label", { style: styles.field, children: [_jsx("span", { children: "Assigned to" }), _jsx("input", { style: styles.input, value: assignee, onChange: (e) => setAssignee(e.target.value), placeholder: "anyone" })] }), _jsxs("label", { style: styles.field, children: [_jsx("span", { children: "With label" }), _jsx("input", { style: styles.input, value: label, onChange: (e) => setLabel(e.target.value), placeholder: "any" })] }), errors.length > 0 && repo && (_jsx("ul", { style: styles.errors, children: errors.map((err) => _jsx("li", { children: err }, err)) })), _jsxs("div", { style: styles.footer, children: [_jsx("span", {}), _jsx("button", { type: "button", style: styles.primary, disabled: errors.length > 0, onClick: () => onSave(draft), children: "Save \u2192" })] })] }));
}
function RoutineView({ config, editable, onEdit, onDone }) {
    const [copied, setCopied] = useState(false);
    const prompt = renderRoutinePrompt(config);
    const labels = [...config.labels.slice(0, 1), CLAIM_LABEL, PARKED_LABEL];
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
        }
        catch {
            setCopied(false);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("ol", { style: styles.steps, children: [_jsxs("li", { children: ["Create labels ", labels.map((l, i) => _jsxs("span", { children: [i > 0 && ", ", _jsx("code", { children: l })] }, l)), " in", " ", _jsx("a", { href: `https://github.com/${config.repo}/labels`, target: "_blank", rel: "noreferrer", children: config.repo }), "."] }), _jsxs("li", { children: ["In ", _jsx("a", { href: "https://claude.ai/code", target: "_blank", rel: "noreferrer", children: "Claude Code" }), ", create a routine on ", _jsx("code", { children: config.repo }), ", paste the prompt below, and trigger it on the GitHub event", " ", _jsx("b", { children: "issue opened" }), "."] })] }), _jsx("textarea", { style: { ...styles.textarea, fontFamily: "monospace", fontSize: 11 }, value: prompt, readOnly: true, rows: 10 }), _jsxs("div", { style: styles.footer, children: [editable
                        ? _jsx("button", { type: "button", style: styles.linkButton, onClick: onEdit, children: "Edit rules" })
                        : _jsx("span", { style: styles.hint, children: "Rules come from props." }), _jsxs("div", { style: styles.actions, children: [_jsx("button", { type: "button", style: styles.secondary, onClick: () => void copy(), children: copied ? "Copied ✓" : "Copy prompt" }), _jsx("button", { type: "button", style: styles.primary, onClick: onDone, children: "Done" })] })] })] }));
}
