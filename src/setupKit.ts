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
export const SETUP_COMMAND = "npx -y github:commit-capital/bugfix-button setup";

/** Plain-text setup instructions for an agent environment. */
export function renderSetupKit(setup: RepoSetup): string {
  const sections: string[] = [];
  if (setup.setupScript.length > 0) {
    sections.push(`Setup script (environment settings → Setup script):\n${setup.setupScript.join("\n")}`);
  }
  sections.push(
    `Allowed domains (if network access is restricted; keep package managers allowed):\n${setup.allowDomains.join("\n")}`,
  );
  if (setup.attachRepos.length > 0) {
    sections.push(
      `GitHub-hosted dependencies (the routine attaches these with add_repo):\n${setup.attachRepos.join("\n")}`,
    );
  }
  if (setup.checks.length > 0) sections.push(`Checks CI runs:\n${setup.checks.join("\n")}`);
  if (setup.notes.length > 0) sections.push(`Notes:\n${setup.notes.join("\n")}`);
  return `${sections.join("\n\n")}\n`;
}
