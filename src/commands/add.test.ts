import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createRepo, useTestDir } from "../test-helpers";

describe("add", () => {
	const ctx = useTestDir();

	test("creates worktree as sibling from nested directory", async () => {
		const { name: origin, branch } = await createRepo(ctx.sh, {
			branch: "main",
		});
		const target = "my-repo";
		await ctx.sh`git witty clone ${origin} ${target}`;

		// Run add from a nested subdirectory inside an existing worktree
		const nested = join(ctx.dir, target, branch, "some", "dir");
		await ctx.sh`mkdir -p ${nested}`;
		const sh = ctx.at(nested);

		// Create the branch in the origin so git worktree add can find it
		await ctx.sh`git -C ${origin} branch feature`;

		await sh`git witty add feature`;

		// Worktree should be at my-repo/feature, not nested under cwd
		const worktreeDir = join(ctx.dir, target, "feature");
		const currentBranch = (
			await ctx.sh`git -C ${worktreeDir} branch --show-current`.text()
		).trim();
		expect(currentBranch).toBe("feature");
	});
});
