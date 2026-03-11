import { afterEach, beforeEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { $, type ShellExpression } from "bun";

const binDir = resolve(import.meta.dir, "../bin");

const testEnv = {
	...Bun.env,
	PATH: `${binDir}:${Bun.env.PATH}`,
	GIT_AUTHOR_NAME: "test",
	GIT_AUTHOR_EMAIL: "test@test.com",
	GIT_COMMITTER_NAME: "test",
	GIT_COMMITTER_EMAIL: "test@test.com",
};

type Sh = (
	strings: TemplateStringsArray,
	...values: ShellExpression[]
) => ReturnType<typeof $>;

function makeSh(cwd: string): Sh {
	return (strings, ...values) =>
		$(strings, ...values)
			.cwd(cwd)
			.env(testEnv)
			.quiet();
}

export interface TestDir {
	readonly dir: string;
	sh: Sh;
	at(cwd: string): Sh;
}

export function useTestDir(): TestDir {
	let dir = "";
	let sh: Sh;
	let at: (cwd: string) => Sh;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "git-witty-"));
		sh = makeSh(dir);
		at = (cwd: string) => makeSh(cwd);
	});

	const ctx: TestDir = {
		get dir() {
			return dir;
		},
		get sh() {
			return sh;
		},
		at(cwd: string) {
			return at(cwd);
		},
	};

	afterEach(async () => {
		await rm(ctx.dir, { recursive: true });
	});

	return ctx;
}

export interface RepoOptions {
	name?: string;
	branch: string;
	commits?: number;
}

export async function createRepo(
	sh: Sh,
	options: RepoOptions,
): Promise<{ name: string; branch: string }> {
	const name = options.name ?? "origin";
	const branch = options.branch;
	const commits = options.commits ?? 1;

	await sh`git init -b ${branch} ${name}`;

	for (let i = 0; i < commits; i++) {
		await sh`git -C ${name} commit --allow-empty -m ${`commit ${i + 1}`}`;
	}

	return { name, branch };
}
