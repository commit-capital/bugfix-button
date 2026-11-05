import type { RepoSetup } from "./setupKit.js";
/** Pixi release known to install in cloud sandboxes. */
export declare const PIXI_VERSION = "0.84.1";
/** GitHub "owner/name" a dependency spec installs from, or null. */
export declare function githubDependencyRepo(spec: string): string | null;
/** Inspect a repository for what its agent sandbox needs. */
export declare function inspectRepo(root: string): RepoSetup;
