import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { Git } from "./git";
import { createRepo, useTestDir } from "./test-helpers";

describe("GitConfig", () => {
	const t = useTestDir();

	async function setup() {
		await createRepo(t.sh, { branch: "main" });
		return new Git().C(`${t.dir}/origin`).config;
	}

	test("set + get round-trip", async () => {
		const config = await setup();

		await config.set("test.foo", "bar");
		expect(await config.get("test.foo")).toBe("bar");
	});

	test("add + getAll multi-value", async () => {
		const config = await setup();

		await config.add("test.protect", "main");
		await config.add("test.protect", "release");
		expect(await config.getAll("test.protect")).toEqual(["main", "release"]);
	});

	test("unset with pattern removes one entry from multi-value", async () => {
		const config = await setup();

		await config.add("test.protect", "main");
		await config.add("test.protect", "release");
		await config.unset("test.protect", "^main$");
		expect(await config.getAll("test.protect")).toEqual(["release"]);
	});

	test("get missing key returns undefined", async () => {
		const config = await setup();

		expect(await config.get("test.nonexistent")).toBeUndefined();
	});

	test("getAll missing key returns []", async () => {
		const config = await setup();

		expect(await config.getAll("test.nonexistent")).toEqual([]);
	});
});

describe("listWorktrees", () => {
	const ctx = useTestDir();

	test("returns branch names from worktrees", async () => {
		const { name: origin, branch } = await createRepo(ctx.sh, {
			branch: "main",
		});
		const target = "my-repo";
		await ctx.sh`git witty clone ${origin} ${target}`;
		const sh = ctx.at(join(ctx.dir, target, branch));
		await ctx.sh`git -C ${origin} branch feature`;
		await sh`git witty add feature`;

		const git = await new Git(["-C", join(ctx.dir, target, branch)]).root();
		const worktrees = await git.listWorktrees();
		const branches = worktrees.map((w) => w.branch);

		expect(branches).toContain(branch);
		expect(branches).toContain("feature");
	});

	test("skips bare entry", async () => {
		const { name: origin, branch } = await createRepo(ctx.sh, {
			branch: "main",
		});
		const target = "my-repo";
		await ctx.sh`git witty clone ${origin} ${target}`;

		const git = await new Git(["-C", join(ctx.dir, target, branch)]).root();
		const worktrees = await git.listWorktrees();

		// Only the primary worktree should be returned, not the bare entry
		expect(worktrees).toHaveLength(1);
		expect(worktrees[0].branch).toBe(branch);
	});
});
