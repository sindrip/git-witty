import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { $, type ShellExpression } from "bun";

const binDir = resolve(import.meta.dir, "../../bin");

const testEnv = {
	...Bun.env,
	PATH: `${binDir}:${Bun.env.PATH}`,
	GIT_AUTHOR_NAME: "test",
	GIT_AUTHOR_EMAIL: "test@test.com",
	GIT_COMMITTER_NAME: "test",
	GIT_COMMITTER_EMAIL: "test@test.com",
};

let tempDir: string;

beforeEach(async () => {
	tempDir = await mkdtemp(join(tmpdir(), "git-witty-"));
});

afterEach(async () => {
	await rm(tempDir, { recursive: true });
});

function sh(strings: TemplateStringsArray, ...values: ShellExpression[]) {
	return $(strings, ...values)
		.cwd(tempDir)
		.env(testEnv)
		.quiet();
}

async function setupRepo(): Promise<{ repo: string; primaryBranch: string }> {
	const origin = "origin";
	const repo = "my-repo";

	await sh`git init ${origin}`;
	await sh`git -C ${origin} commit --allow-empty -m "init"`;
	await sh`git witty clone ${origin} ${repo}`;

	const primaryBranch = (
		await sh`git -C ${repo}/.bare symbolic-ref --short HEAD`.text()
	).trim();

	return { repo, primaryBranch };
}

test("add creates a worktree for an existing branch", async () => {
	const { repo, primaryBranch } = await setupRepo();

	await sh`git -C ${join(repo, primaryBranch)} branch feature-a`;
	await sh`cd ${join(repo, primaryBranch)} && git witty add feature-a`;

	const branch = (
		await sh`git -C ${join(repo, "feature-a")} branch --show-current`.text()
	).trim();
	expect(branch).toBe("feature-a");
});

test("add creates a worktree that is listed", async () => {
	const { repo, primaryBranch } = await setupRepo();

	await sh`git -C ${join(repo, primaryBranch)} branch feature-b`;
	await sh`cd ${join(repo, primaryBranch)} && git witty add feature-b`;

	const worktreeLines = (await sh`git -C ${repo} worktree list`.text())
		.trim()
		.split("\n");

	expect(worktreeLines).toHaveLength(3);
	expect(worktreeLines.some((l) => l.includes("[feature-b]"))).toBe(true);
});
