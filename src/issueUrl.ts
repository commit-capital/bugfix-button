import type { FeedbackConfig } from "./config.js";

const TITLE_MAX = 80;

/** First line of the description, trimmed to a title. */
export function issueTitle(description: string): string {
  const firstLine = description.trim().split("\n")[0].trim();
  if (firstLine.length <= TITLE_MAX) return firstLine;
  return `${firstLine.slice(0, TITLE_MAX - 1).trimEnd()}…`;
}

export interface IssueDraft {
  title: string;
  body: string;
}

/** Where the issue was filed from. */
export interface FilingContext {
  appName: string;
  pageUrl: string;
  /** Extra footer facts, such as a git branch. */
  details: string[];
}

/** Prefilled GitHub new-issue URL. */
export function buildIssueUrl(config: FeedbackConfig, issue: IssueDraft, context: FilingContext): string {
  const where = [...context.details, context.pageUrl && `page ${context.pageUrl}`].filter(Boolean).join(" · ");
  const params = new URLSearchParams({
    title: issue.title,
    body: `${issue.body.trim()}\n\n---\n<sub>🐞 Filed from ${context.appName} · ${where}</sub>`,
  });
  if (config.labels.length > 0) params.set("labels", config.labels.join(","));
  if (config.assignee) params.set("assignees", config.assignee);
  return `https://github.com/${config.repo}/issues/new?${params.toString()}`;
}
