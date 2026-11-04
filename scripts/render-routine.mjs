// Print the routine prompt for your rules.
// Usage: pnpm run routine -- --repo owner/name --filed-by login --assignee login --label feedback
//        pnpm run routine -- --doc   (rewrites ROUTINE.md from the template)
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { configErrors, renderRoutinePrompt, TEMPLATE_CONFIG } from "../dist/index.js";
import { routineDoc } from "../dist/routineDoc.js";

const { values } = parseArgs({
  options: {
    repo: { type: "string" },
    "filed-by": { type: "string" },
    assignee: { type: "string" },
    label: { type: "string" },
    doc: { type: "boolean" },
  },
});

if (values.doc) {
  writeFileSync(new URL("../ROUTINE.md", import.meta.url), routineDoc(renderRoutinePrompt(TEMPLATE_CONFIG)));
  process.exit(0);
}

const config = {
  repo: values.repo ?? "",
  filedBy: values["filed-by"] ?? null,
  assignee: values.assignee ?? null,
  labels: values.label ? [values.label] : [],
};
const errors = configErrors(config);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
process.stdout.write(renderRoutinePrompt(config));
