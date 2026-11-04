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
    /** "top-right" floats the button; "inline" flows in a header. */
    placement?: "top-right" | "inline";
}
export declare function BugfixButton(props: BugfixButtonProps): import("react").JSX.Element;
