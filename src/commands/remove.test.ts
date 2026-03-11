import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createRepo, useTestDir } from "../test-helpers";

describe("remove", () => {
	const ctx = useTestDir();

	test("removes worktree as sibling from nested directory", async () => {
		const { name: origin, branch } = await createRepo(ctx.sh, {
			branch: "main",
		});
		const target = "my-repo";
		await ctx.sh`git witty clone ${origin} ${target}`;

		const repoSh = ctx.at(join(ctx.dir, target, branch));
		await ctx.sh`git -C ${origin} branch feature`;
		await repoSh`git witty add feature`;

		// Remove from a nested directory
		const nested = join(ctx.dir, target, branch, "some", "dir");
		await ctx.sh`mkdir -p ${nested}`;
		const sh = ctx.at(nested);

		await sh`git witty remove feature`;

		const worktreeLines = (await repoSh`git worktree list`.text())
			.trim()
			.split("\n");
		expect(worktreeLines).toHaveLength(2);
		expect(worktreeLines.some((line) => line.includes("[feature]"))).toBe(
			false,
		);

		// Directory should also be removed from disk
		const featureDir = join(ctx.dir, target, "feature");
		expect(await Bun.file(featureDir).exists()).toBe(false);
	});
});
