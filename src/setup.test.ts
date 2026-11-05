import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { githubDependencyRepo, inspectRepo } from "./setup.js";
import { renderSetupKit } from "./setupKit.js";

function repo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "bugfix-setup-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

describe("githubDependencyRepo", () => {
  it("reads GitHub specs", () => {
    expect(githubDependencyRepo("github:acme/lib#v1.0.0")).toBe("acme/lib");
    expect(githubDependencyRepo("git+https://github.com/acme/lib.git#main")).toBe("acme/lib");
    expect(githubDependencyRepo("acme/lib")).toBe("acme/lib");
  });

  it("ignores registry and local specs", () => {
    expect(githubDependencyRepo("^19.3.0")).toBeNull();
    expect(githubDependencyRepo("workspace:*")).toBeNull();
    expect(githubDependencyRepo("file:../lib")).toBeNull();
  });
});

describe("inspectRepo", () => {
  it("covers a pixi + pnpm repo like startupSourcer", () => {
    const setup = inspectRepo(repo({
      "pixi.toml": 'channels = ["conda-forge"]\n',
      "package.json": JSON.stringify({
        packageManager: "pnpm@12.4.1",
        dependencies: { "@acme/button": "github:acme/button#v0.2.2", react: "19.3.1" },
      }),
      ".pre-commit-config.yaml": "repos: []\n",
      ".github/workflows/tests.yml": "defaults:\n  run:\n    working-directory: app\njobs:\n  t:\n    steps:\n      - run: pixi run pytest\n      - name: lint\n        run: pnpm run lint\n",
    }));
    expect(setup.setupScript.join("\n")).toContain("pixi-x86_64-unknown-linux-musl.tar.gz");
    expect(setup.setupScript).toContain("npm install -g pnpm@12.4.1  # package.json pins it");
    expect(setup.attachRepos).toEqual(["acme/button"]);
    expect(setup.allowDomains).toEqual(expect.arrayContaining([
      "codeload.github.com", "conda.anaconda.org", "private-user-images.githubusercontent.com",
    ]));
    expect(setup.checks).toEqual(["pixi run pytest", "pnpm run lint"]);
    expect(setup.notes.join(" ")).toContain("pre-commit");
  });

  it("finds a nested frontend package", () => {
    const setup = inspectRepo(repo({
      "app/frontend/package.json": JSON.stringify({ packageManager: "pnpm@11.0.0" }),
    }));
    expect(setup.setupScript[0]).toContain("pnpm@11.0.0");
  });

  it("needs only the screenshot host for a plain repo", () => {
    const setup = inspectRepo(repo({ "README.md": "hi" }));
    expect(setup.setupScript).toEqual([]);
    expect(setup.allowDomains).toEqual(["private-user-images.githubusercontent.com"]);
    expect(renderSetupKit(setup)).not.toContain("Setup script");
  });
});

describe("bugfixButton Vite plugin", () => {
  it("writes the repo and, in dev, the setup into the page", async () => {
    const { bugfixButton } = await import("./vite.js");
    const plugin = bugfixButton();
    plugin.configResolved({ command: "serve" });
    const [tag] = plugin.transformIndexHtml();
    expect(tag.children.startsWith("window.__BUGFIX_BUTTON__=")).toBe(true);
    const info = JSON.parse(tag.children.slice("window.__BUGFIX_BUTTON__=".length, -1));
    expect(info.setup.allowDomains).toContain("private-user-images.githubusercontent.com");

    const build = bugfixButton();
    build.configResolved({ command: "build" });
    expect(JSON.parse(build.transformIndexHtml()[0].children.slice(25, -1)).setup).toBeNull();
  });
});
