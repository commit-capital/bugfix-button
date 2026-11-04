/** Where issues go and which ones the routine fixes. */
export interface FeedbackConfig {
    /** GitHub repository, as "owner/name". */
    repo: string;
    /** Routine rule: only fix issues this login filed. */
    filedBy: string | null;
    /** Prefilled assignee; the routine fixes only issues assigned to this login. */
    assignee: string | null;
    /** Prefilled labels; the routine fixes only issues carrying the first one. */
    labels: string[];
}
/** Problems that make a config unusable. */
export declare function configErrors(config: FeedbackConfig): string[];
/** Repository slug from a git remote URL. */
export declare function repoFromRemote(remote: string): string | null;
/** Saved config for this site, or null. */
export declare function loadSavedConfig(): FeedbackConfig | null;
export declare function saveConfig(config: FeedbackConfig): void;
