import { describe, expect, test } from "bun:test";
import { Git } from "./git";
import { createRepo, useTestDir } from "./test-helpers";

describe("GitConfig", () => {
	const t = useTestDir();

	test("set + get round-trip", async () => {
		await createRepo(t.sh, { branch: "main" });
		const config = new Git().C(`${t.dir}/origin`).config;

		await config.set("test.foo", "bar");
		expect(await config.get("test.foo")).toBe("bar");
	});

	test("add + getAll multi-value", async () => {
		await createRepo(t.sh, { branch: "main" });
		const config = new Git().C(`${t.dir}/origin`).config;

		await config.add("test.protect", "main");
		await config.add("test.protect", "release");
		expect(await config.getAll("test.protect")).toEqual(["main", "release"]);
	});

	test("unset with pattern removes one entry from multi-value", async () => {
		await createRepo(t.sh, { branch: "main" });
		const config = new Git().C(`${t.dir}/origin`).config;

		await config.add("test.protect", "main");
		await config.add("test.protect", "release");
		await config.unset("test.protect", "^main$");
		expect(await config.getAll("test.protect")).toEqual(["release"]);
	});

	test("get missing key returns undefined", async () => {
		await createRepo(t.sh, { branch: "main" });
		const config = new Git().C(`${t.dir}/origin`).config;

		expect(await config.get("test.nonexistent")).toBeUndefined();
	});

	test("getAll missing key returns []", async () => {
		await createRepo(t.sh, { branch: "main" });
		const config = new Git().C(`${t.dir}/origin`).config;

		expect(await config.getAll("test.nonexistent")).toEqual([]);
	});
});
