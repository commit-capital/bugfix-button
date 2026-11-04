import type { FeedbackConfig } from "./config.js";
/** First line of the description, trimmed to a title. */
export declare function issueTitle(description: string): string;
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
export declare function buildIssueUrl(config: FeedbackConfig, issue: IssueDraft, context: FilingContext): string;
