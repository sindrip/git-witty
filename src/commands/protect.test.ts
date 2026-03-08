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

function at(cwd: string) {
	return (strings: TemplateStringsArray, ...values: ShellExpression[]) =>
		$(strings, ...values)
			.cwd(cwd)
			.env(testEnv)
			.quiet();
}

async function setupRepo() {
	const sh = at(tempDir);
	await sh`git init -b main origin`;
	await sh`git -C origin commit --allow-empty -m "init"`;
	await sh`git -C origin branch develop`;
	await sh`git witty clone origin my-repo`;
	const worktree = join(tempDir, "my-repo", "main");
	return { worktree };
}

test("protect adds branch to config", async () => {
	const { worktree } = await setupRepo();
	const sh = at(worktree);

	await sh`git witty protect main`;

	const branches = (await sh`git config --get-all witty.protect`.text()).trim();
	expect(branches).toBe("main");
});

test("protect multiple branches in one command", async () => {
	const { worktree } = await setupRepo();
	const sh = at(worktree);

	await sh`git witty protect main develop`;

	const branches = (await sh`git config --get-all witty.protect`.text())
		.trim()
		.split("\n");
	expect(branches).toEqual(["main", "develop"]);
});

test("protect is idempotent", async () => {
	const { worktree } = await setupRepo();
	const sh = at(worktree);

	await sh`git witty protect main`;
	await sh`git witty protect main`;

	const branches = (await sh`git config --get-all witty.protect`.text())
		.trim()
		.split("\n");
	expect(branches).toEqual(["main"]);
});

test("unprotect removes branch from config", async () => {
	const { worktree } = await setupRepo();
	const sh = at(worktree);

	await sh`git witty protect main`;
	await sh`git witty protect develop`;
	await sh`git witty unprotect main`;

	const branches = (await sh`git config --get-all witty.protect`.text())
		.trim()
		.split("\n");
	expect(branches).toEqual(["develop"]);
});

test("protect non-existent branch fails", async () => {
	const { worktree } = await setupRepo();
	const sh = at(worktree);

	const result = await sh`git witty protect nope`.nothrow();
	expect(result.exitCode).not.toBe(0);
	expect(result.stderr.toString()).toContain("does not exist");
});

test("unprotect non-protected branch fails", async () => {
	const { worktree } = await setupRepo();
	const sh = at(worktree);

	const result = await sh`git witty unprotect main`.nothrow();
	expect(result.exitCode).not.toBe(0);
	expect(result.stderr.toString()).toContain("not protected");
});
