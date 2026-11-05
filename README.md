# bugfix-button

A 🐞 Feedback button for any React app. Click it, describe the bug, and it
opens a prefilled GitHub issue (one more click files it). A Claude Code routine
([ROUTINE.md](ROUTINE.md)) then picks the issue up, fixes it, opens a PR, and
drives it to a squash-merge.

## Install

```bash
pnpm add github:commit-capital/bugfix-button#v0.2.1
```

Each version on `main` is published as a `vX.Y.Z` release (see
`.github/workflows/release.yml`). Pin one with `#vX.Y.Z`, or take updates
within a major with `#semver:^0.2.0`. The built `dist/` is committed, so
installs run no scripts.
React 18+ is a peer dependency.

## Use

Drop it anywhere. By default it floats in the top-right corner:

```tsx
import { BugfixButton } from "@commit-capital/bugfix-button";

<BugfixButton
  repo="commit-capital/startupSourcer"
  filedBy="brandonburr"
  assignee="brandonburr"
  appName="Pretzel"
/>
```

Or put it in your own header with `placement="inline"`.

| Prop | Meaning |
|------|---------|
| `repo` | `owner/name` to file in. Omit it to set up in the browser. |
| `filedBy` | Routine rule: fix only issues this login filed. |
| `assignee` | Prefilled assignee. The routine fixes only issues assigned to them. |
| `labels` | Prefilled labels. The routine fixes only issues with the first one. |
| `appName` | Shown in the issue footer. Defaults to `document.title`. |
| `details` | Extra footer facts, such as ``["branch `main`"]``. |
| `generate` | `(description) => Promise<{ title, body }>`: have your backend (or an LLM) write the issue. Falls back to the raw text after 12 s or on error. |
| `placement` | `"top-right"` (default, floating) or `"inline"`. |
| `buttonClassName` | Your own class for the button; drops its built-in styles. |

The dialog has dictation (Web Speech, where the browser supports it), copies
a page screenshot to the clipboard to paste into the issue, keeps the draft
across dismissals, and renders under `document.body` so no header stacking
context can hide it.

### Theme

Set any of these CSS variables on `:root` (or a parent) to match your app:
`--bugfix-bg`, `--bugfix-fg`, `--bugfix-muted`, `--bugfix-border`,
`--bugfix-accent`, `--bugfix-danger`, `--bugfix-field-bg`, `--bugfix-font`.

```css
:root { --bugfix-bg: var(--panel); --bugfix-fg: var(--text); --bugfix-accent: var(--accent); }
```

Set at least one of `filedBy` or `assignee`, so a stranger's issue is never
auto-fixed. On a public repository always set `filedBy`.

### Set up in the browser

Leave out `repo` and the first click opens a short setup: which repository to
file in and which rules the auto-fixer uses (filed by, assigned to, label). It
saves the answers in that browser and shows the routine prompt, filled in,
with a Copy button. Click the ⚙ link in the dialog to see it again.

To prefill the repository from your git remote, add the Vite plugin:

```ts
// vite.config.ts
import { bugfixButton } from "@commit-capital/bugfix-button/vite";

export default defineConfig({ plugins: [react(), bugfixButton()] });
```

Browser setup is per browser. Once the rules are right, put them in props so
every teammate gets the same config.

## The auto-fix routine

1. If you set `labels`, create the first one in the target repository;
   GitHub drops a missing label from the issue link. The routine's own
   labels create themselves.
2. Get the prompt: the ⚙ view in the dialog, or
   `pnpm run routine -- --repo owner/name --filed-by you --assignee you --label feedback`.
3. In Claude Code on the web, create a routine with the target repository
   attached, paste the prompt, turn on push notifications, and add a GitHub
   trigger for **issue opened** on that repository.

[ROUTINE.md](ROUTINE.md) has the generic template and how the claim lock,
parking, and trust rules work.

## Develop

```bash
pnpm install
pnpm test
pnpm run typecheck
pnpm run build                    # commit dist/ with your change
pnpm run routine -- --doc         # regenerate ROUTINE.md
```

CI fails when `dist/` or `ROUTINE.md` is stale.

`ROUTINE.md` is generated from `src/routinePrompt.ts`; a test fails when they
drift.
