const REPO_PATTERN = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;
const LOGIN_PATTERN = /^[A-Za-z0-9-]+$/;
/** Problems that make a config unusable. */
export function configErrors(config) {
    const errors = [];
    if (!REPO_PATTERN.test(config.repo))
        errors.push("Repository must look like owner/name.");
    for (const login of [config.filedBy, config.assignee]) {
        if (login !== null && !LOGIN_PATTERN.test(login))
            errors.push(`"${login}" is not a GitHub login.`);
    }
    if (config.filedBy === null && config.assignee === null) {
        errors.push("Set a filer or an assignee so strangers' issues are never auto-fixed.");
    }
    return errors;
}
/** Repository slug from a git remote URL. */
export function repoFromRemote(remote) {
    const match = remote.trim().match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/);
    return match ? match[1] : null;
}
const STORAGE_PREFIX = "bugfix-button:config";
/** Saved config for this site, or null. */
export function loadSavedConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (!isConfig(parsed))
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
export function saveConfig(config) {
    try {
        localStorage.setItem(STORAGE_PREFIX, JSON.stringify(config));
    }
    catch {
        // Storage blocked; config lasts this page.
    }
}
function isConfig(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const v = value;
    const nullableString = (x) => x === null || typeof x === "string";
    return typeof v.repo === "string" && nullableString(v.filedBy) && nullableString(v.assignee) &&
        Array.isArray(v.labels) && v.labels.every((l) => typeof l === "string");
}
