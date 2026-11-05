import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
/** Pixi release known to install in cloud sandboxes. */
export const PIXI_VERSION = "0.84.1";
const SKIP_DIRS = new Set(["node_modules", ".git", ".pixi", "dist", "build", ".venv", "venv", "target"]);
const MAX_DEPTH = 3;
function findFiles(root, name) {
    const found = [];
    const walk = (dir, depth) => {
        let entries;
        try {
            entries = readdirSync(dir);
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const path = join(dir, entry);
            if (entry === name)
                found.push(path);
            if (depth < MAX_DEPTH && !SKIP_DIRS.has(entry) && !entry.startsWith(".")) {
                try {
                    if (statSync(path).isDirectory())
                        walk(path, depth + 1);
                }
                catch {
                    // Unreadable entry.
                }
            }
        }
    };
    walk(root, 0);
    return found;
}
function readJson(path) {
    try {
        const value = JSON.parse(readFileSync(path, "utf8"));
        return typeof value === "object" && value !== null ? value : null;
    }
    catch {
        return null;
    }
}
const GITHUB_SPEC = /^(?:github:|git\+https:\/\/github\.com\/|https:\/\/github\.com\/|git\+ssh:\/\/git@github\.com\/|git@github\.com:)?([A-Za-z0-9-]+\/[A-Za-z0-9._-]+?)(?:\.git)?(?:#.*)?$/;
/** GitHub "owner/name" a dependency spec installs from, or null. */
export function githubDependencyRepo(spec) {
    return spec.match(GITHUB_SPEC)?.[1] ?? null;
}
function inspectNode(root, setup) {
    for (const path of findFiles(root, "package.json")) {
        const pkg = readJson(path);
        if (!pkg)
            continue;
        const where = relative(root, path) || "package.json";
        const manager = typeof pkg.packageManager === "string" ? pkg.packageManager : "";
        const pnpm = manager.match(/^pnpm@([0-9.]+)/);
        if (pnpm)
            setup.setupScript.push(`npm install -g pnpm@${pnpm[1]}  # ${where} pins it`);
        if (manager.startsWith("yarn@"))
            setup.setupScript.push(`corepack enable  # ${where} pins ${manager}`);
        for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
            const deps = pkg[field];
            if (typeof deps !== "object" || deps === null)
                continue;
            for (const spec of Object.values(deps)) {
                const repo = typeof spec === "string" ? githubDependencyRepo(spec) : null;
                if (repo && !setup.attachRepos.includes(repo))
                    setup.attachRepos.push(repo);
            }
        }
        const engines = pkg.engines;
        if (engines && typeof engines.node === "string") {
            setup.notes.push(`${where} needs Node ${engines.node}.`);
        }
    }
    if (setup.attachRepos.length > 0)
        setup.allowDomains.push("codeload.github.com");
}
function inspectPixi(root, setup) {
    const manifest = join(root, "pixi.toml");
    if (!existsSync(manifest))
        return;
    setup.setupScript.push('mkdir -p "$HOME/.pixi/bin"', `curl -fsSL https://github.com/prefix-dev/pixi/releases/download/v${PIXI_VERSION}/pixi-x86_64-unknown-linux-musl.tar.gz | tar xz -C "$HOME/.pixi/bin"`, 'ln -sf "$HOME/.pixi/bin/pixi" /usr/local/bin/pixi');
    setup.allowDomains.push("github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com");
    const text = readFileSync(manifest, "utf8");
    if (/conda-forge|anaconda/.test(text))
        setup.allowDomains.push("conda.anaconda.org");
    if (/prefix\.dev/.test(text))
        setup.allowDomains.push("prefix.dev", "repo.prefix.dev");
}
function inspectPython(root, setup) {
    if (existsSync(join(root, "uv.lock"))) {
        setup.setupScript.push("command -v uv >/dev/null || pip install uv");
    }
    if (existsSync(join(root, "poetry.lock"))) {
        setup.setupScript.push("command -v poetry >/dev/null || pip install poetry");
    }
}
function inspectOther(root, setup) {
    if (existsSync(join(root, ".pre-commit-config.yaml"))) {
        setup.notes.push("Commits run pre-commit hooks; they need the toolchain the setup script installs.");
    }
    const toolchains = [["go.mod", "Go"], ["Cargo.toml", "Rust"], ["Gemfile", "Ruby"]];
    for (const [file, name] of toolchains) {
        if (existsSync(join(root, file)))
            setup.notes.push(`${file} needs ${name}; check the sandbox has it.`);
    }
}
function inspectCi(root, setup) {
    const dir = join(root, ".github", "workflows");
    let files;
    try {
        files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
    }
    catch {
        return;
    }
    for (const file of files) {
        const text = readFileSync(join(dir, file), "utf8");
        for (const match of text.matchAll(/^[ \t]*(?:-[ \t]*)?run:[ \t]*([^|>\s].*)$/gm)) {
            const command = match[1].trim().replace(/^["']|["']$/g, "");
            if (!setup.checks.includes(command))
                setup.checks.push(command);
        }
    }
}
/** Inspect a repository for what its agent sandbox needs. */
export function inspectRepo(root) {
    const setup = { setupScript: [], allowDomains: [], attachRepos: [], checks: [], notes: [] };
    inspectPixi(root, setup);
    inspectPython(root, setup);
    inspectNode(root, setup);
    inspectOther(root, setup);
    inspectCi(root, setup);
    setup.allowDomains.push("private-user-images.githubusercontent.com");
    setup.allowDomains = [...new Set(setup.allowDomains)];
    return setup;
}
