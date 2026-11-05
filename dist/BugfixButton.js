import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { configErrors, loadSavedConfig, saveConfig } from "./config.js";
import { buildIssueUrl, issueTitle } from "./issueUrl.js";
import { renderRoutinePrompt } from "./routinePrompt.js";
import { copyPageScreenshot, SCREENSHOT_SKIP_ATTR } from "./screenshot.js";
import { renderSetupKit, SETUP_COMMAND } from "./setupKit.js";
import { useSpeechInput } from "./speech.js";
import { styles } from "./styles.js";
// Written into the page by the Vite plugin.
function pageInfo() {
    const info = globalThis.__BUGFIX_BUTTON__;
    return typeof info === "object" && info !== null ? info : {};
}
const DRAFT_KEY = "bugfix-button:draft";
const MIC_KEY = "bugfix-button:mic";
const SCREENSHOT_KEY = "bugfix-button:screenshot";
/** Longest wait for `generate` before filing raw. */
export const GENERATE_TIMEOUT_MS = 12000;
function detectedRepo() {
    const { repo } = pageInfo();
    return typeof repo === "string" ? repo : null;
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
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: props.buttonClassName, style: buttonStyle, onClick: () => setOpen(true), title: "Report a bug or request a feature", children: "\uD83D\uDC1E File a Bug" }), open && createPortal(_jsx(FeedbackModal, { ...props, onClose: () => setOpen(false) }), document.body)] }));
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
function GearIcon() {
    return (_jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" }) }));
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
                            : "Describe the bug or request. The first line becomes the issue title.", value: description, onChange: (e) => setDescription(e.target.value), onKeyDown: handleKeyDown, rows: 7, autoFocus: true, disabled: busy }), speech.supported && (_jsx("button", { type: "button", style: speech.active ? { ...styles.mic, ...styles.micActive } : styles.mic, onClick: speech.toggle, title: speech.active ? "Stop voice input" : "Start voice input", "aria-label": speech.active ? "Stop voice input" : "Start voice input", disabled: busy, children: _jsx(MicIcon, {}) }))] }), speech.error && _jsxs("span", { style: { ...styles.hint, ...styles.errors }, children: ["Mic error: ", speech.error] }), _jsxs("label", { style: styles.option, children: [_jsx("input", { type: "checkbox", checked: screenshot, onChange: toggleScreenshot, disabled: busy }), "Copy a screenshot to the clipboard"] }), _jsxs("div", { style: styles.footer, children: [_jsxs("button", { type: "button", style: styles.settings, onClick: onSettings, title: "Repository and auto-fix settings", children: [_jsx(GearIcon, {}), " ", config.repo] }), _jsxs("div", { style: styles.actions, children: [_jsx("button", { type: "button", style: styles.secondary, onClick: onClose, disabled: busy, children: "Cancel" }), _jsx("button", { type: "button", style: styles.primary, onClick: () => void openIssue(), disabled: !description.trim() || busy, children: busy ? "Opening…" : "Open Issue →" })] })] }), _jsx("span", { style: styles.hint, children: hint })] }));
}
function SetupView({ initial, onSave }) {
    const [repo, setRepo] = useState(initial?.repo ?? detectedRepo() ?? "");
    const [filedBy, setFiledBy] = useState(initial?.filedBy ?? "");
    const [assignee, setAssignee] = useState(initial?.assignee ?? "");
    const [label, setLabel] = useState(initial?.labels[0] ?? "");
    const draft = {
        repo: repo.trim(),
        filedBy: filedBy.trim() || null,
        assignee: assignee.trim() || null,
        labels: label.trim() ? [label.trim()] : [],
    };
    const errors = configErrors(draft);
    return (_jsxs(_Fragment, { children: [_jsxs("label", { style: styles.field, children: [_jsx("span", { children: "File issues in" }), _jsx("input", { style: styles.input, value: repo, onChange: (e) => setRepo(e.target.value), placeholder: "owner/name", autoFocus: true })] }), _jsx("p", { style: styles.hint, children: "Auto-fix an issue only when it matches every rule below." }), _jsxs("label", { style: styles.field, children: [_jsx("span", { children: "Filed by (GitHub login)" }), _jsx("input", { style: styles.input, value: filedBy, onChange: (e) => setFiledBy(e.target.value), placeholder: "anyone" })] }), _jsxs("label", { style: styles.field, children: [_jsx("span", { children: "Assigned to" }), _jsx("input", { style: styles.input, value: assignee, onChange: (e) => setAssignee(e.target.value), placeholder: "anyone" })] }), _jsxs("label", { style: styles.field, children: [_jsx("span", { children: "With label" }), _jsx("input", { style: styles.input, value: label, onChange: (e) => setLabel(e.target.value), placeholder: "any" }), _jsx("span", { style: styles.hint, children: "The label must already exist in the repository." })] }), errors.length > 0 && repo && (_jsx("ul", { style: styles.errors, children: errors.map((err) => _jsx("li", { children: err }, err)) })), _jsxs("div", { style: styles.footer, children: [_jsx("span", {}), _jsx("button", { type: "button", style: styles.primary, disabled: errors.length > 0, onClick: () => onSave(draft), children: "Save \u2192" })] })] }));
}
const ROUTINE_KEY = "bugfix-button:routine";
function loadRules(config) {
    const defaults = { filedBy: config.filedBy ?? "", assignee: config.assignee ?? "", afterFix: "merge" };
    const raw = readPref(ROUTINE_KEY);
    if (!raw)
        return defaults;
    try {
        const saved = JSON.parse(raw);
        if (typeof saved !== "object" || saved === null)
            return defaults;
        const v = saved;
        if (v.repo !== config.repo || typeof v.filedBy !== "string" || typeof v.assignee !== "string")
            return defaults;
        return { filedBy: v.filedBy, assignee: v.assignee, afterFix: v.afterFix === "review" ? "review" : "merge" };
    }
    catch {
        return defaults;
    }
}
function detectedSetup() {
    const { setup } = pageInfo();
    return typeof setup === "object" && setup !== null ? setup : null;
}
function CopyButton({ text, label }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
        }
        catch {
            setCopied(false);
        }
    };
    return (_jsx("button", { type: "button", style: styles.secondary, onClick: () => void copy(), children: copied ? "Copied ✓" : label }));
}
function RoutineView({ config, editable, onEdit, onDone }) {
    const [rules, setRules] = useState(() => loadRules(config));
    const setup = detectedSetup();
    const update = (next) => {
        const merged = { ...rules, ...next };
        setRules(merged);
        writePref(ROUTINE_KEY, JSON.stringify({ repo: config.repo, ...merged }));
    };
    const routineConfig = {
        ...config,
        filedBy: rules.filedBy.trim() || null,
        assignee: rules.assignee.trim() || null,
    };
    // An unscoped prompt would fix strangers' issues.
    const errors = configErrors(routineConfig);
    const prompt = renderRoutinePrompt(routineConfig, rules.afterFix);
    return (_jsxs(_Fragment, { children: [_jsxs("p", { style: styles.instructions, children: ["Your auto-fix routine for ", _jsx("code", { children: config.repo }), ". Each person sets up their own."] }), _jsxs("label", { style: styles.field, children: [_jsx("span", { children: "Fix issues filed by (GitHub login)" }), _jsx("input", { style: styles.input, value: rules.filedBy, onChange: (e) => update({ filedBy: e.target.value }), placeholder: "anyone" })] }), _jsxs("label", { style: styles.field, children: [_jsx("span", { children: "and assigned to" }), _jsx("input", { style: styles.input, value: rules.assignee, onChange: (e) => update({ assignee: e.target.value }), placeholder: "anyone" })] }), _jsxs("div", { style: styles.field, role: "radiogroup", "aria-label": "When a fix passes its checks", children: [_jsx("span", { children: "When a fix passes its checks" }), _jsxs("label", { style: styles.option, children: [_jsx("input", { type: "radio", checked: rules.afterFix === "merge", onChange: () => update({ afterFix: "merge" }) }), "Merge it"] }), _jsxs("label", { style: styles.option, children: [_jsx("input", { type: "radio", checked: rules.afterFix === "review", onChange: () => update({ afterFix: "review" }) }), "Open a PR for my review"] })] }), errors.length > 0 ? (_jsx("ul", { style: styles.errors, children: errors.map((err) => _jsx("li", { children: err }, err)) })) : (_jsxs(_Fragment, { children: [_jsx("p", { style: styles.sectionTitle, children: "1. Prepare the agent's environment" }), setup ? (_jsxs(_Fragment, { children: [_jsx("p", { style: styles.hint, children: "Detected from this repository:" }), _jsx("textarea", { style: styles.code, value: renderSetupKit(setup), readOnly: true, rows: 6, wrap: "off" }), _jsx("div", { style: styles.actions, children: _jsx(CopyButton, { text: renderSetupKit(setup), label: "Copy setup" }) })] })) : (_jsxs("p", { style: styles.hint, children: ["Run ", _jsx("code", { children: SETUP_COMMAND }), " in your repository. It prints the setup script, the domains to allow, and the checks the agent must be able to run."] })), _jsx("p", { style: styles.sectionTitle, children: "2. Create the task" }), _jsxs("p", { style: styles.instructions, children: ["In any AI agent that can run a task on a GitHub event (Claude Code, Codex, \u2026), create a task for ", _jsx("code", { children: config.repo }), " that runs on ", _jsx("b", { children: "issue opened" }), ", with this prompt:"] }), _jsx("textarea", { style: styles.code, value: prompt, readOnly: true, rows: 8, wrap: "off" })] })), _jsxs("div", { style: styles.footer, children: [editable
                        ? _jsx("button", { type: "button", style: styles.linkButton, onClick: onEdit, children: "Edit where issues go" })
                        : _jsx("span", {}), _jsxs("div", { style: styles.actions, children: [errors.length === 0 && _jsx(CopyButton, { text: prompt, label: "Copy prompt" }), _jsx("button", { type: "button", style: styles.primary, onClick: onDone, children: "Done" })] })] })] }));
}
