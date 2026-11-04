import { execFileSync } from "node:child_process";
import { repoFromRemote } from "./config.js";
/** Detect the GitHub repo from the git origin. */
export function bugfixButton() {
    return {
        name: "bugfix-button",
        config() {
            let repo = null;
            try {
                const remote = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" });
                repo = repoFromRemote(remote);
            }
            catch {
                // No git or no origin.
            }
            return { define: { __BUGFIX_BUTTON_REPO__: JSON.stringify(repo) } };
        },
    };
}
