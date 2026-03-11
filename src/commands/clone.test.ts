import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { BARE_DIR, GITDIR_POINTER } from "../git";
import { createRepo, useTestDir } from "../test-helpers";

describe("clone", () => {
	const ctx = useTestDir();

	test("creates worktree layout from local repo", async () => {
		const { name: origin, branch } = await createRepo(ctx.sh, {
			branch: "main",
		});
		const target = "my-repo";

		await ctx.sh`git witty clone ${origin} ${target}`;

		// Verify .git pointer file we create
		expect(await Bun.file(join(ctx.dir, target, ".git")).text()).toBe(
			GITDIR_POINTER,
		);

		// Verify worktree is a functional git checkout on the primary branch
		const worktreeBranch = (
			await ctx.sh`git -C ${join(target, branch)} branch --show-current`.text()
		).trim();
		expect(worktreeBranch).toBe(branch);

		// Verify both bare repo and worktree are registered
		const worktreeLines = (await ctx.sh`git -C ${target} worktree list`.text())
			.trim()
			.split("\n");
		expect(worktreeLines).toHaveLength(2);
		expect(worktreeLines[0]).toContain(BARE_DIR);
		expect(worktreeLines[1]).toContain(`[${branch}]`);
	});

	test("infers repo name from url", async () => {
		await createRepo(ctx.sh, { name: "origin/my-project", branch: "main" });
		const targetDir = "target";

		await ctx.sh`mkdir -p ${targetDir}`;
		await ctx.at(
			join(ctx.dir, targetDir),
		)`git witty clone ${join(ctx.dir, "origin/my-project")}`;

		expect(
			await Bun.file(join(ctx.dir, targetDir, "my-project", ".git")).text(),
		).toBe(GITDIR_POINTER);
	});

	test("creates a workspace file", async () => {
		const { name: origin, branch } = await createRepo(ctx.sh, {
			branch: "main",
		});
		const target = "my-repo";

		await ctx.sh`git witty clone ${origin} ${target}`;

		const wsPath = join(ctx.dir, target, `${target}.code-workspace`);
		const workspace = await Bun.file(wsPath).json();
		expect(workspace.folders).toEqual([{ path: branch }]);
	});

	test("creates worktree for non-main primary branch", async () => {
		const { name: origin, branch } = await createRepo(ctx.sh, {
			branch: "develop",
		});
		const target = "my-repo";

		await ctx.sh`git witty clone ${origin} ${target}`;

		const worktreeBranch = (
			await ctx.sh`git -C ${join(target, branch)} branch --show-current`.text()
		).trim();
		expect(worktreeBranch).toBe(branch);
		expect(await Bun.file(join(ctx.dir, target, "main")).exists()).toBe(false);
	});
});
