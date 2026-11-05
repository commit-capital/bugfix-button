# bugfix-button

A 🐞 File a Bug button for any React app. Describe a bug, and it opens a
prefilled GitHub issue to file in one click. An AI agent task
([ROUTINE.md](ROUTINE.md)) can then fix the issue, open a PR, and merge it.

## Install

```bash
pnpm add github:commit-capital/bugfix-button
```

Add `#v0.2.2` to the end to pin a release. React 18+ is required.

## Use

```tsx
import { BugfixButton } from "@commit-capital/bugfix-button";

<BugfixButton />
```

The first click asks which repository to file in and which issues the
auto-fixer may take, then gives you the agent prompt. Click ⚙ in the dialog
to see it again. To set it in code instead:

```tsx
<BugfixButton
  repo="your-org/your-app"
  filedBy={currentUser.githubLogin}
  assignee={currentUser.githubLogin}
  appName="Your App"
  placement="inline"
/>
```

| Prop | Meaning |
|------|---------|
| `repo` | `owner/name` to file in. Omit it to set up in the browser. |
| `filedBy` | Auto-fix only issues this GitHub login filed. |
| `assignee` | Prefilled assignee; auto-fix only issues assigned to them. |
| `labels` | Prefilled labels; auto-fix only issues with the first one. The label must already exist. |
| `appName` | Shown in the issue footer. Defaults to the page title. |
| `details` | Extra footer lines, such as the git branch. |
| `generate` | `(description) => Promise<{ title, body }>` to have your backend write the issue. |
| `placement` | `"top-right"` (default, floating) or `"inline"` for your own header. |
| `buttonClassName` | Your own class for the button. |

Set `filedBy` or `assignee` (or both), so a stranger's issue is never
auto-fixed.

To theme it, set `--bugfix-bg`, `--bugfix-fg`, `--bugfix-muted`,
`--bugfix-border`, `--bugfix-accent`, `--bugfix-danger`, `--bugfix-field-bg`
or `--bugfix-font` on `:root`.

To prefill the repository from your git remote, add the Vite plugin:

```ts
import { bugfixButton } from "@commit-capital/bugfix-button/vite";

export default defineConfig({ plugins: [react(), bugfixButton()] });
```

## Auto-fix

Create a task in any AI agent that can run on a GitHub event (Claude Code,
Codex, …). Trigger it on **issue opened** in your repository, and give it the
prompt from the ⚙ view. [ROUTINE.md](ROUTINE.md) explains how it works.

## Develop

```bash
pnpm install
pnpm test
pnpm run build             # commit dist/ with your change
pnpm run routine -- --doc  # regenerate ROUTINE.md
```

Bump `version` in `package.json` to publish a `vX.Y.Z` release on merge.
