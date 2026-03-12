import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { PROTECT_CONFIG_KEY } from "../git";
import { createRepo, useTestDir } from "../test-helpers";

describe("pre-push hook", () => {
	const ctx = useTestDir();

	async function setup() {
		const { name: origin, branch } = await createRepo(ctx.sh, {
			branch: "main",
		});
		const target = "my-repo";
		await ctx.sh`git witty clone ${origin} ${target}`;

		const worktreeDir = join(ctx.dir, target, branch);
		const bareDir = join(ctx.dir, target, ".bare");
		const sh = ctx.at(worktreeDir);

		// Create a bare remote we can push to
		const remote = join(ctx.dir, "remote.git");
		await ctx.sh`git clone --bare ${origin} ${remote}`;
		await sh`git remote add upstream ${remote}`;

		return { sh, worktreeDir, bareDir, branch };
	}

	test("allows push to unprotected branch", async () => {
		const { sh } = await setup();

		await sh`git commit --allow-empty -m "test"`;
		const result = await sh`git push upstream main`.nothrow();

		expect(result.exitCode).toBe(0);
	});

	test("blocks push to protected branch", async () => {
		const { sh, bareDir } = await setup();
		await sh`git config --file ${bareDir}/config --add ${PROTECT_CONFIG_KEY} main`;

		await sh`git commit --allow-empty -m "test"`;
		const result = await sh`git push upstream main`.nothrow();

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr.toString()).toContain(
			"push to protected branch 'main'",
		);
	});

	test("blocks force push to protected branch", async () => {
		const { sh, bareDir } = await setup();
		await sh`git config --file ${bareDir}/config --add ${PROTECT_CONFIG_KEY} main`;

		await sh`git commit --allow-empty -m "first"`;
		await sh`git push upstream main`.nothrow();
		await sh`git reset --hard HEAD~1`;
		await sh`git commit --allow-empty -m "divergent"`;
		const result = await sh`git push --force upstream main`.nothrow();

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr.toString()).toContain(
			"push to protected branch 'main'",
		);
	});
});
