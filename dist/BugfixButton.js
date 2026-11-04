import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { configErrors, loadSavedConfig, saveConfig } from "./config.js";
import { buildIssueUrl } from "./issueUrl.js";
import { CLAIM_LABEL, PARKED_LABEL, renderRoutinePrompt } from "./routinePrompt.js";
import { styles } from "./styles.js";
const DRAFT_KEY = "bugfix-button:draft";
const DEFAULT_LABEL = "feedback";
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
export function BugfixButton(props) {
    const [open, setOpen] = useState(false);
    const placement = props.placement ?? "top-right";
    const buttonStyle = placement === "top-right"
        ? { ...styles.button, ...styles.floating }
        : styles.button;
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", style: buttonStyle, onClick: () => setOpen(true), title: "Report a bug or request a feature", children: "\uD83D\uDC1E Feedback" }), open && _jsx(FeedbackModal, { ...props, onClose: () => setOpen(false) })] }));
}
function FeedbackModal({ onClose, ...props }) {
    const fixedConfig = configFromProps(props);
    const [config, setConfig] = useState(() => fixedConfig ?? loadSavedConfig());
    const [view, setView] = useState(config ? "file" : "setup");
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
        body = (_jsx(FileView, { config: config, appName: props.appName ?? document.title, onSettings: () => setView("routine"), onClose: onClose }));
    }
    return (_jsx("div", { style: styles.overlay, onKeyDown: handleKeyDown, children: _jsxs("div", { style: styles.modal, role: "dialog", "aria-modal": "true", "aria-label": "File a bug or feature request", children: [_jsxs("div", { style: styles.modalHeader, children: [_jsxs("span", { children: ["\uD83D\uDC1E ", view === "file" ? "File a bug or request" : "Set up the bug button"] }), _jsx("button", { type: "button", style: styles.close, onClick: onClose, "aria-label": "Close", children: "\u2715" })] }), body] }) }));
}
function readDraft() {
    try {
        return localStorage.getItem(DRAFT_KEY) ?? "";
    }
    catch {
        return "";
    }
}
function writeDraft(text) {
    try {
        if (text)
            localStorage.setItem(DRAFT_KEY, text);
        else
            localStorage.removeItem(DRAFT_KEY);
    }
    catch {
        // Storage blocked; keep draft in memory.
    }
}
function FileView({ config, appName, onSettings, onClose }) {
    const [description, setDescription] = useState(readDraft);
    const updateDescription = (text) => {
        setDescription(text);
        writeDraft(text);
    };
    const openIssue = () => {
        if (!description.trim())
            return;
        const url = buildIssueUrl(config, description, window.location.href, appName);
        window.open(url, "_blank", "noopener,noreferrer");
        writeDraft("");
        onClose();
    };
    const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter")
            openIssue();
    };
    return (_jsxs(_Fragment, { children: [_jsx("textarea", { style: styles.textarea, placeholder: "Describe the bug or request. The first line becomes the issue title.", value: description, onChange: (e) => updateDescription(e.target.value), onKeyDown: handleKeyDown, rows: 7, autoFocus: true }), _jsxs("div", { style: styles.footer, children: [_jsxs("button", { type: "button", style: styles.linkButton, onClick: onSettings, children: ["\u2699 ", config.repo] }), _jsxs("div", { style: styles.actions, children: [_jsx("button", { type: "button", style: styles.secondary, onClick: onClose, children: "Cancel" }), _jsx("button", { type: "button", style: styles.primary, onClick: openIssue, disabled: !description.trim(), children: "Open Issue \u2192" })] })] }), _jsx("span", { style: styles.hint, children: "\u2318\u21B5 to open \u00B7 paste screenshots into the GitHub issue" })] }));
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
