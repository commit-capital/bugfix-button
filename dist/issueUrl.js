const TITLE_MAX = 80;
/** First line of the description, trimmed to a title. */
export function issueTitle(description) {
    const firstLine = description.trim().split("\n")[0].trim();
    if (firstLine.length <= TITLE_MAX)
        return firstLine;
    return `${firstLine.slice(0, TITLE_MAX - 1).trimEnd()}…`;
}
/** Prefilled GitHub new-issue URL. */
export function buildIssueUrl(config, description, pageUrl, appName) {
    const params = new URLSearchParams({
        title: issueTitle(description),
        body: `${description.trim()}\n\n---\n<sub>🐞 Filed from ${appName} · page ${pageUrl}</sub>`,
    });
    if (config.labels.length > 0)
        params.set("labels", config.labels.join(","));
    if (config.assignee)
        params.set("assignees", config.assignee);
    return `https://github.com/${config.repo}/issues/new?${params.toString()}`;
}
