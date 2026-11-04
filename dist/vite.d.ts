/** Minimal Vite plugin shape, so Vite stays optional. */
export interface BugfixButtonVitePlugin {
    name: string;
    config: () => {
        define: Record<string, string>;
    };
}
/** Detect the GitHub repo from the git origin. */
export declare function bugfixButton(): BugfixButtonVitePlugin;
