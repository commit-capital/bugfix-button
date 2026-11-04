import type { FeedbackConfig } from "./config.js";
/** First line of the description, trimmed to a title. */
export declare function issueTitle(description: string): string;
/** Prefilled GitHub new-issue URL. */
export declare function buildIssueUrl(config: FeedbackConfig, description: string, pageUrl: string, appName: string): string;
