import { execFileSync } from "node:child_process";
import { repoFromRemote } from "./config.js";
import { inspectRepo } from "./setup.js";
function git(args) {
    try {
        return execFileSync("git", args, { encoding: "utf8" }).trim();
    }
    catch {
        return null;
    }
}
/** Detect the GitHub repo, and in dev its agent setup. */
export function bugfixButton() {
    return {
        name: "bugfix-button",
        config(_config, env) {
            const remote = git(["remote", "get-url", "origin"]);
            const repo = remote ? repoFromRemote(remote) : null;
            // Dev only, so production bundles skip it.
            let setup = null;
            const root = env.command === "serve" ? git(["rev-parse", "--show-toplevel"]) : null;
            if (root)
                setup = inspectRepo(root);
            return {
                define: {
                    __BUGFIX_BUTTON_REPO__: JSON.stringify(repo),
                    __BUGFIX_BUTTON_SETUP__: JSON.stringify(setup),
                },
            };
        },
    };
}
