import type { FeedbackConfig } from "./config.js";
/** Labels the routine uses to lock and park issues. */
export declare const CLAIM_LABEL = "fix-in-progress";
export declare const PARKED_LABEL = "awaiting-human-response";
/** Search query that finds issues in the routine's scope. */
export declare function scopeQuery(config: FeedbackConfig): string;
/** Login whose comments may steer a fix. */
export declare function ownerLogin(config: FeedbackConfig): string;
/** Agent instructions for the auto-fix routine. */
export declare function renderRoutinePrompt(config: FeedbackConfig): string;
/** Placeholder rules for the generic template. */
export declare const TEMPLATE_CONFIG: FeedbackConfig;
