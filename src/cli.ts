#!/usr/bin/env node
import { parseArgs } from "node:util";
import { configErrors } from "./config.js";
import { renderRoutinePrompt } from "./routinePrompt.js";
import { inspectRepo } from "./setup.js";
import { renderSetupKit } from "./setupKit.js";

const USAGE = `Usage:
  bugfix-button setup [--root DIR]
      Print the agent environment setup for the repository at DIR (default: .).
  bugfix-button routine --repo OWNER/NAME [--filed-by LOGIN] [--assignee LOGIN] [--label LABEL] [--review]
      Print the auto-fix routine prompt. --review stops at a green PR instead of merging.
`;

const [command, ...rest] = process.argv.slice(2);

if (command === "setup") {
  const { values } = parseArgs({ args: rest, options: { root: { type: "string" } } });
  process.stdout.write(renderSetupKit(inspectRepo(values.root ?? process.cwd())));
} else if (command === "routine") {
  const { values } = parseArgs({
    args: rest,
    options: {
      repo: { type: "string" },
      "filed-by": { type: "string" },
      assignee: { type: "string" },
      label: { type: "string" },
      review: { type: "boolean" },
    },
  });
  const config = {
    repo: values.repo ?? "",
    filedBy: values["filed-by"] ?? null,
    assignee: values.assignee ?? null,
    labels: values.label ? [values.label] : [],
  };
  const errors = configErrors(config);
  if (errors.length > 0) {
    process.stderr.write(`${errors.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(renderRoutinePrompt(config, values.review ? "review" : "merge"));
} else {
  process.stderr.write(USAGE);
  process.exit(command ? 1 : 0);
}
