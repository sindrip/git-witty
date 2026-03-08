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

test("clone creates worktree layout from local repo", async () => {
	const origin = "origin";
	const target = "my-repo";

	await sh`git init ${origin}`;
	await sh`git -C ${origin} commit --allow-empty -m "init"`;

	await sh`git witty clone ${origin} ${target}`;

	// Verify .git pointer file we create
	expect(await Bun.file(join(tempDir, target, ".git")).text()).toBe(
		"gitdir: ./.bare\n",
	);

	// Verify worktree is a functional git checkout on the primary branch
	const branch = (
		await sh`git -C ${target}/.bare symbolic-ref --short HEAD`.text()
	).trim();
	const worktreeBranch = (
		await sh`git -C ${join(target, branch)} branch --show-current`.text()
	).trim();
	expect(worktreeBranch).toBe(branch);

	// Verify both bare repo and worktree are registered
	const worktreeLines = (await sh`git -C ${target} worktree list`.text())
		.trim()
		.split("\n");
	expect(worktreeLines).toHaveLength(2);
	expect(worktreeLines[0]).toContain(".bare");
	expect(worktreeLines[1]).toContain(`[${branch}]`);
});

test("clone infers repo name from url", async () => {
	const origin = "origin/my-project";
	const targetDir = "target";

	await sh`git init ${origin}`;
	await sh`git -C ${origin} commit --allow-empty -m "init"`;

	await sh`mkdir -p ${targetDir}`;
	await sh`cd ${targetDir} && git witty clone ${join(tempDir, origin)}`;

	expect(
		await Bun.file(join(tempDir, targetDir, "my-project", ".git")).text(),
	).toBe("gitdir: ./.bare\n");
});

test("clone creates worktree for non-main primary branch", async () => {
	const origin = "origin";
	const target = "my-repo";
	const branch = "develop";

	await sh`git init -b ${branch} ${origin}`;
	await sh`git -C ${origin} commit --allow-empty -m "init"`;

	await sh`git witty clone ${origin} ${target}`;

	const worktreeBranch = (
		await sh`git -C ${join(target, branch)} branch --show-current`.text()
	).trim();
	expect(worktreeBranch).toBe(branch);
	expect(await Bun.file(join(tempDir, target, "main")).exists()).toBe(false);
});
