/** What an agent's sandbox needs to run a repository's checks. */
export interface RepoSetup {
    /** Shell lines for the cloud environment's setup script. */
    setupScript: string[];
    /** Hosts to allow when the agent's network is restricted. */
    allowDomains: string[];
    /** GitHub repositories the routine must attach to install dependencies. */
    attachRepos: string[];
    /** Commands the repository's CI runs. */
    checks: string[];
    /** Toolchain facts the setup script doesn't cover. */
    notes: string[];
}
/** Command that prints a repository's setup kit. */
export declare const SETUP_COMMAND = "npx -y github:commit-capital/bugfix-button setup";
/** Plain-text setup instructions for an agent environment. */
export declare function renderSetupKit(setup: RepoSetup): string;
