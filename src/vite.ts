import { execFileSync } from "node:child_process";
import { repoFromRemote } from "./config.js";

/** Minimal Vite plugin shape, so Vite stays optional. */
export interface BugfixButtonVitePlugin {
  name: string;
  config: () => { define: Record<string, string> };
}

/** Detect the GitHub repo from the git origin. */
export function bugfixButton(): BugfixButtonVitePlugin {
  return {
    name: "bugfix-button",
    config() {
      let repo: string | null = null;
      try {
        const remote = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" });
        repo = repoFromRemote(remote);
      } catch {
        // No git or no origin.
      }
      return { define: { __BUGFIX_BUTTON_REPO__: JSON.stringify(repo) } };
    },
  };
}
