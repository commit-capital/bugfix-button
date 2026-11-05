import { execFileSync } from "node:child_process";
import { repoFromRemote } from "./config.js";
import { inspectRepo } from "./setup.js";
import type { RepoSetup } from "./setupKit.js";

/** Minimal Vite plugin shape, so Vite stays optional. */
export interface BugfixButtonVitePlugin {
  name: string;
  config: (config: unknown, env: { command: string }) => { define: Record<string, string> };
}

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

/** Detect the GitHub repo, and in dev its agent setup. */
export function bugfixButton(): BugfixButtonVitePlugin {
  return {
    name: "bugfix-button",
    config(_config, env) {
      const remote = git(["remote", "get-url", "origin"]);
      const repo = remote ? repoFromRemote(remote) : null;
      // Dev only, so production bundles skip it.
      let setup: RepoSetup | null = null;
      const root = env.command === "serve" ? git(["rev-parse", "--show-toplevel"]) : null;
      if (root) setup = inspectRepo(root);
      return {
        define: {
          __BUGFIX_BUTTON_REPO__: JSON.stringify(repo),
          __BUGFIX_BUTTON_SETUP__: JSON.stringify(setup),
        },
      };
    },
  };
}
