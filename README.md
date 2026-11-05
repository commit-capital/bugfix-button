# bugfix-button

A 🐞 File a Bug button for any React app. Describe a bug, and it opens a
prefilled GitHub issue to file in one click. An AI agent task
([ROUTINE.md](ROUTINE.md)) can then fix the issue, open a PR, and merge it.

## Install

```bash
pnpm add github:commit-capital/bugfix-button
```

Add `#v0.3.1` to the end to pin a release. React 18+ is required.

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

Each person who wants their bugs fixed sets up their own agent task:

1. **Prepare the environment.** In your repository, run:
   ```bash
   npx -y github:commit-capital/bugfix-button setup
   ```
   It reads the repository (pixi, uv, pnpm/yarn pins, GitHub-hosted
   dependencies, pre-commit, CI workflows) and prints the setup script, the
   domains to allow, and the checks the agent must be able to run. With the
   Vite plugin, the ⚙ view shows the same thing during `vite dev`.
2. **Pick your rules in the ⚙ view:** whose issues to fix (filed by, assigned
   to), and whether a fix that passes its checks is merged or left as a PR for
   your review. The view saves your choices in your browser and updates the
   prompt.
3. **Create the task** in any AI agent that can run on a GitHub event (Claude
   Code, Codex, …). Trigger it on **issue opened**, and give it the prompt.

Everyone's routines can run side by side: each takes only its own issues, and
a claim branch stops two from fixing the same one. The CLI prints a prompt
too: `npx -y github:commit-capital/bugfix-button routine --repo owner/name
--filed-by you --assignee you [--review]`. [ROUTINE.md](ROUTINE.md) explains
how the prompt works.

## Develop

```bash
pnpm install
pnpm test
pnpm run build             # commit dist/ with your change
pnpm run routine -- --doc  # regenerate ROUTINE.md
```

Bump `version` in `package.json` to publish a `vX.Y.Z` release on merge.
