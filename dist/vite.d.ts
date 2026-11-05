import type { RepoSetup } from "./setupKit.js";
/** Global the plugin writes into the page for the button. */
export declare const PAGE_GLOBAL = "__BUGFIX_BUTTON__";
/** What the plugin tells the button about the repository. */
export interface PageInfo {
    repo: string | null;
    setup: RepoSetup | null;
}
/** Minimal Vite plugin shape, so Vite stays optional. */
export interface BugfixButtonVitePlugin {
    name: string;
    configResolved: (config: {
        command: string;
    }) => void;
    transformIndexHtml: () => {
        tag: string;
        children: string;
        injectTo: "head";
    }[];
}
/** Tell the button its repo and, in dev, its agent setup. */
export declare function bugfixButton(): BugfixButtonVitePlugin;
