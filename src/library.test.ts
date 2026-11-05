import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { configErrors, repoFromRemote } from "./config.js";
import type { FeedbackConfig } from "./config.js";
import { buildIssueUrl, issueTitle } from "./issueUrl.js";
import { renderRoutinePrompt, scopeQuery, TEMPLATE_CONFIG } from "./routinePrompt.js";
import { routineDoc } from "./routineDoc.js";

const config: FeedbackConfig = {
  repo: "commit-capital/startupSourcer",
  filedBy: "brandonburr",
  assignee: "brandonburr",
  labels: ["feedback"],
};

describe("issueTitle", () => {
  it("uses the first line", () => {
    expect(issueTitle("  Score badge is wrong\nmore detail")).toBe("Score badge is wrong");
  });

  it("truncates long lines", () => {
    const title = issueTitle("x".repeat(200));
    expect(title.length).toBe(80);
    expect(title.endsWith("…")).toBe(true);
  });
});

describe("buildIssueUrl", () => {
  it("prefills title, body, labels and assignee", () => {
    const url = new URL(buildIssueUrl(
      config,
      { title: "Broken sort", body: "Broken sort\nClick the score column" },
      { appName: "Pretzel", pageUrl: "https://app/?tab=x", details: ["branch `main`"] },
    ));
    expect(url.origin + url.pathname).toBe("https://github.com/commit-capital/startupSourcer/issues/new");
    expect(url.searchParams.get("title")).toBe("Broken sort");
    expect(url.searchParams.get("labels")).toBe("feedback");
    expect(url.searchParams.get("assignees")).toBe("brandonburr");
    const body = url.searchParams.get("body") ?? "";
    expect(body.startsWith("Broken sort\nClick the score column")).toBe(true);
    expect(body).toContain("Filed from Pretzel · branch `main` · page https://app/?tab=x");
  });

  it("omits unset assignee and labels", () => {
    const url = new URL(buildIssueUrl({ ...config, assignee: null, labels: [] }, { title: "x", body: "x" }, { appName: "A", pageUrl: "p", details: [] }));
    expect(url.searchParams.has("assignees")).toBe(false);
    expect(url.searchParams.has("labels")).toBe(false);
  });
});

describe("configErrors", () => {
  it("accepts a complete config", () => {
    expect(configErrors(config)).toEqual([]);
  });

  it("rejects a config that would fix anyone's issues", () => {
    expect(configErrors({ ...config, filedBy: null, assignee: null })).toHaveLength(1);
  });

  it("rejects a malformed repo", () => {
    expect(configErrors({ ...config, repo: "startupSourcer" })).toHaveLength(1);
  });
});

describe("repoFromRemote", () => {
  it("parses https and ssh remotes", () => {
    expect(repoFromRemote("https://github.com/commit-capital/prospector.git\n")).toBe("commit-capital/prospector");
    expect(repoFromRemote("git@github.com:commit-capital/prospector.git")).toBe("commit-capital/prospector");
  });

  it("ignores other hosts", () => {
    expect(repoFromRemote("https://gitlab.com/a/b.git")).toBeNull();
  });
});

describe("routine prompt", () => {
  it("searches exactly the configured scope", () => {
    expect(scopeQuery(config)).toBe(
      "repo:commit-capital/startupSourcer is:issue is:open author:brandonburr assignee:brandonburr " +
      "label:feedback -label:fix-in-progress -label:awaiting-human-response",
    );
  });

  it("names the repo and the trusted commenter", () => {
    const prompt = renderRoutinePrompt(config);
    expect(prompt).toContain('owner "commit-capital", repo "startupSourcer"');
    expect(prompt).toContain('user.login is exactly "brandonburr"');
    expect(prompt).toContain("repos/commit-capital/startupSourcer/issues/");
  });

  it("merges by default and only hands off in review mode", () => {
    const merge = renderRoutinePrompt(config);
    expect(merge).toContain("mcp__github__merge_pull_request");
    const review = renderRoutinePrompt(config, "review");
    expect(review).toContain("Do NOT merge");
    expect(review).not.toContain("mcp__github__merge_pull_request");
    expect(review).toContain("leave it green for brandonburr to review");
  });

  it("matches the committed ROUTINE.md", () => {
    const committed = readFileSync("ROUTINE.md", "utf8");
    expect(committed).toBe(routineDoc(renderRoutinePrompt(TEMPLATE_CONFIG)));
  });
});
