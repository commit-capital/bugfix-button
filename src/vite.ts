import { execFileSync } from "node:child_process";
import { repoFromRemote } from "./config.js";
import { inspectRepo } from "./setup.js";
import type { RepoSetup } from "./setupKit.js";

/** Global the plugin writes into the page for the button. */
export const PAGE_GLOBAL = "__BUGFIX_BUTTON__";

/** What the plugin tells the button about the repository. */
export interface PageInfo {
  repo: string | null;
  setup: RepoSetup | null;
}

/** Minimal Vite plugin shape, so Vite stays optional. */
export interface BugfixButtonVitePlugin {
  name: string;
  configResolved: (config: { command: string }) => void;
  transformIndexHtml: () => { tag: string; children: string; injectTo: "head" }[];
}

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

/** Tell the button its repo and, in dev, its agent setup. */
export function bugfixButton(): BugfixButtonVitePlugin {
  let command = "build";
  return {
    name: "bugfix-button",
    configResolved(config) {
      command = config.command;
    },
    // A page script reaches pre-bundled deps; a define would not.
    transformIndexHtml() {
      const remote = git(["remote", "get-url", "origin"]);
      const root = command === "serve" ? git(["rev-parse", "--show-toplevel"]) : null;
      const info: PageInfo = {
        repo: remote ? repoFromRemote(remote) : null,
        setup: root ? inspectRepo(root) : null,
      };
      const json = JSON.stringify(info).replace(/</g, "\\u003c");
      return [{ tag: "script", children: `window.${PAGE_GLOBAL}=${json};`, injectTo: "head" }];
    },
  };
}
