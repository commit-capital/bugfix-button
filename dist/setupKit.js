/** Command that prints a repository's setup kit. */
export const SETUP_COMMAND = "npx -y github:commit-capital/bugfix-button setup";
/** Plain-text setup instructions for an agent environment. */
export function renderSetupKit(setup) {
    const sections = [];
    if (setup.setupScript.length > 0) {
        sections.push(`Setup script (environment settings → Setup script):\n${setup.setupScript.join("\n")}`);
    }
    sections.push(`Allowed domains (if network access is restricted; keep package managers allowed):\n${setup.allowDomains.join("\n")}`);
    if (setup.attachRepos.length > 0) {
        sections.push(`GitHub-hosted dependencies (the routine attaches these with add_repo):\n${setup.attachRepos.join("\n")}`);
    }
    if (setup.checks.length > 0)
        sections.push(`Checks CI runs:\n${setup.checks.join("\n")}`);
    if (setup.notes.length > 0)
        sections.push(`Notes:\n${setup.notes.join("\n")}`);
    return `${sections.join("\n\n")}\n`;
}
