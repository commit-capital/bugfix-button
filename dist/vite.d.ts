/** Minimal Vite plugin shape, so Vite stays optional. */
export interface BugfixButtonVitePlugin {
    name: string;
    config: (config: unknown, env: {
        command: string;
    }) => {
        define: Record<string, string>;
    };
}
/** Detect the GitHub repo, and in dev its agent setup. */
export declare function bugfixButton(): BugfixButtonVitePlugin;
