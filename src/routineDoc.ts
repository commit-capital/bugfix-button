/** ROUTINE.md contents around a rendered prompt. */
export function routineDoc(prompt: string): string {
  return `# Auto-fix routine

The Feedback button files issues. This routine fixes them: a Claude Code
routine that wakes when an issue is opened, claims one in-scope issue, fixes it
on \`claude/issue-N\`, opens a PR, waits for checks, and squash-merges.

You rarely need this file directly. Click ⚙ in the Feedback dialog to get the
prompt filled in with your repository and rules, or run:

\`\`\`bash
pnpm run routine -- --repo owner/name --filed-by you --assignee you --label feedback
\`\`\`

## Set it up

1. If you use a label rule, create that label in the target repository.
   GitHub silently drops a missing label from the new-issue link, so the
   issue would arrive unlabeled and out of scope. The routine's own labels,
   \`fix-in-progress\` and \`awaiting-human-response\`, are created the first
   time it sets them.
2. In Claude Code on the web, create a routine with the target repository
   attached and push notifications on.
3. Paste the prompt below with your values in place of \`OWNER/REPO\`,
   \`FILER_LOGIN\` and \`ASSIGNEE_LOGIN\` (drop a rule line if you don't want
   that rule).
4. Add a GitHub trigger on the repository for **issue opened**. Add an
   hourly schedule too if you want parked or failed issues retried.

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
