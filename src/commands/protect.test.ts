import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { Git, PROTECT_CONFIG_KEY } from "../git";
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

		const result = await config.getAll(PROTECT_CONFIG_KEY);
		expect(result).toEqual(["main", "release"]);
	});

	test("removes deselected branches", async () => {
		const config = await setup();
		await config.add(PROTECT_CONFIG_KEY, "main");
		await config.add(PROTECT_CONFIG_KEY, "release");

		await syncProtected(["main", "release"], ["release"], config);

		const result = await config.getAll(PROTECT_CONFIG_KEY);
		expect(result).toEqual(["release"]);
	});

	test("handles mixed adds and removes", async () => {
		const config = await setup();
		await config.add(PROTECT_CONFIG_KEY, "main");

		await syncProtected(["main"], ["release"], config);

		const result = await config.getAll(PROTECT_CONFIG_KEY);
		expect(result).toEqual(["release"]);
	});

	test("no-op when selection unchanged", async () => {
		const config = await setup();
		await config.add(PROTECT_CONFIG_KEY, "main");

		await syncProtected(["main"], ["main"], config);

		const result = await config.getAll(PROTECT_CONFIG_KEY);
		expect(result).toEqual(["main"]);
	});
});
