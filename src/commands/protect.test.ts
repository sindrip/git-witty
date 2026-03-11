import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { Git } from "../git";
import { createRepo, useTestDir } from "../test-helpers";
import { syncProtected } from "./protect";

describe("syncProtected", () => {
	const ctx = useTestDir();

	async function setup() {
		const { name: origin, branch } = await createRepo(ctx.sh, {
			branch: "main",
		});
		const target = "my-repo";
		await ctx.sh`git witty clone ${origin} ${target}`;
		const dir = join(ctx.dir, target, branch);
		const git = await new Git(["-C", dir]).root();
		return git.config;
	}

	test("adds newly selected branches", async () => {
		const config = await setup();

		await syncProtected([], ["main", "release"], config);

		const result = await config.getAll("witty.protect");
		expect(result).toEqual(["main", "release"]);
	});

	test("removes deselected branches", async () => {
		const config = await setup();
		await config.add("witty.protect", "main");
		await config.add("witty.protect", "release");

		await syncProtected(["main", "release"], ["release"], config);

		const result = await config.getAll("witty.protect");
		expect(result).toEqual(["release"]);
	});

	test("handles mixed adds and removes", async () => {
		const config = await setup();
		await config.add("witty.protect", "main");

		await syncProtected(["main"], ["release"], config);

		const result = await config.getAll("witty.protect");
		expect(result).toEqual(["release"]);
	});

	test("no-op when selection unchanged", async () => {
		const config = await setup();
		await config.add("witty.protect", "main");

		await syncProtected(["main"], ["main"], config);

		const result = await config.getAll("witty.protect");
		expect(result).toEqual(["main"]);
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
		const { branch } = await createRepo(ctx.sh, { branch: "main" });
		const target = "my-repo";
		await ctx.sh`git witty clone origin ${target}`;

		const git = await new Git(["-C", join(ctx.dir, target, branch)]).root();
		const worktrees = await git.listWorktrees();

		// Should not contain any empty strings or bare-related entries
		for (const w of worktrees) {
			expect(w.branch.length).toBeGreaterThan(0);
		}
	});
});
