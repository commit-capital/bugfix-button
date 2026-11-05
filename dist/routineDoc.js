/** ROUTINE.md contents around a rendered prompt. */
export function routineDoc(prompt) {
    return `# Auto-fix routine

The File a Bug button files issues. This prompt fixes them: an AI agent task
that runs when an issue is opened, claims one in-scope issue, fixes it on
\`claude/issue-N\`, opens a PR, waits for checks, and squash-merges.

Click ⚙ in the File a Bug dialog to get the prompt filled in for your
repository, or run:

\`\`\`bash
pnpm run routine -- --repo owner/name --filed-by you --assignee you
\`\`\`

## Set it up

1. Create a task in any AI agent that can run on a GitHub event (Claude Code,
   Codex, …), with access to the repository.
2. Trigger it on **issue opened** in that repository. An hourly schedule too
   retries parked or failed issues.
3. Give it the prompt below, with your values in place of \`OWNER/REPO\`,
   \`FILER_LOGIN\` and \`ASSIGNEE_LOGIN\`. Drop any rule you don't want.

The prompt names Claude Code's GitHub tools; another agent uses its own.
A label rule's label must exist before anyone files, because GitHub drops a
missing label from the new-issue link. The prompt's own labels create
themselves.

## Scope rules

The search in STEP 1 is the trust boundary. An issue is in scope only when it
matches every rule you set: filed by, assigned to, and labeled. On a public
repository always set "filed by", because anyone can open an issue there.
Prefilled assignees and labels only stick when the filer has triage access.

Parked issues carry \`awaiting-human-response\`; reply in the comments and
remove that label to re-queue. A stale \`fix-in-progress\` label or
\`claude/issue-N\` branch from a crashed run blocks the issue until you remove
both.

## Prompt template

\`\`\`text
${prompt}\`\`\`
`;
}
