import type { IssueDraft } from "./issueUrl.js";
/** Longest wait for `generate` before filing raw. */
export declare const GENERATE_TIMEOUT_MS = 12000;
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
    /** Extra footer facts, such as a git branch. */
    details?: string[];
    /** Turns the raw description into a title and body. */
    generate?: (description: string) => Promise<IssueDraft>;
    /** "top-right" floats the button; "inline" flows in a header. */
    placement?: "top-right" | "inline";
    /** Replaces the button's built-in styles. */
    buttonClassName?: string;
}
export declare function BugfixButton(props: BugfixButtonProps): import("react").JSX.Element;
