import { dirname, resolve } from "node:path";
import { $ } from "bun";

export class GitConfig {
	#git: Git;

	constructor(git: Git) {
		this.#git = git;
	}

	async get(key: string): Promise<string | undefined> {
		const result = await this.#git
			.exec("config", "--get", key)
			.nothrow()
			.quiet();
		if (result.exitCode !== 0) return undefined;
		return result.text().trim();
	}

	async getAll(key: string): Promise<string[]> {
		const result = await this.#git
			.exec("config", "--get-all", key)
			.nothrow()
			.quiet();
		if (result.exitCode !== 0) return [];
		return result
			.text()
			.trim()
			.split("\n")
			.filter((line) => line.length > 0);
	}

	set(key: string, value: string) {
		return this.#git.exec("config", key, value);
	}

	add(key: string, value: string) {
		return this.#git.exec("config", "--add", key, value);
	}

	unset(key: string, valuePattern?: string) {
		if (valuePattern !== undefined) {
			return this.#git.exec("config", "--unset", key, valuePattern);
		}
		return this.#git.exec("config", "--unset-all", key);
	}
}

export class Git {
	#flags: string[];
	#rootDir?: string;

	constructor(flags: string[] = []) {
		this.#flags = flags;
	}

	C(dir: string) {
		return new Git([...this.#flags, "-C", dir]);
	}

	async rootDir(): Promise<string> {
		if (!this.#rootDir) {
			const commonDir = (
				await this.exec("rev-parse", "--git-common-dir").text()
			).trim();
			this.#rootDir = resolve(dirname(commonDir));
		}
		return this.#rootDir;
	}

	async root(): Promise<Git> {
		return this.C(await this.rootDir());
	}

	get config() {
		return new GitConfig(this);
	}

	clone(url: string, dir: string) {
		return $`git ${this.#flags} clone --bare ${url} ${dir}`;
	}

	worktree(cmd: string, ...args: string[]) {
		return $`git ${this.#flags} worktree ${cmd} ${args}`;
	}

	async listWorktrees(): Promise<{ branch: string; path: string }[]> {
		const result = await this.worktree("list", "--porcelain").quiet();
		const entries = result.text().split("\n\n");
		const worktrees: { branch: string; path: string }[] = [];
		for (const entry of entries) {
			if (entry.includes("bare")) continue;
			const branchMatch = entry.match(/^branch refs\/heads\/(.+)$/m);
			const pathMatch = entry.match(/^worktree (.+)$/m);
			if (branchMatch?.[1] && pathMatch?.[1]) {
				worktrees.push({ branch: branchMatch[1], path: pathMatch[1] });
			}
		}
		return worktrees;
	}

	async listBranches(): Promise<string[]> {
		const result = await this.exec(
			"for-each-ref",
			"--format=%(refname:short)",
			"refs/heads/",
		).quiet();
		return result
			.text()
			.trim()
			.split("\n")
			.filter((line) => line.length > 0);
	}

	/** Escape hatch for subcommands not covered above */
	exec(...args: string[]) {
		return $`git ${this.#flags} ${args}`;
	}
}
