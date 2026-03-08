import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { $ } from "bun";
import { getProtectedBranches } from "../commands/protect";

export async function referenceTransaction(state: string) {
	if (state !== "prepared") {
		return;
	}

	const input = await Bun.stdin.text();

	const protectedBranches = await getProtectedBranches();
	if (protectedBranches.length === 0) {
		return;
	}

	for (const line of input.trim().split("\n")) {
		const [, newValue, ref] = line.split(" ");

		if (ref !== "HEAD") {
			continue;
		}

		// symbolic-ref reads the pre-transaction HEAD, which is the branch
		// we're leaving. This is correct — we want to block leaving a protected branch.
		const currentBranch = (
			await $`git symbolic-ref --short HEAD`.quiet().nothrow().text()
		).trim();

		if (!currentBranch) {
			continue;
		}

		// Allow checkout to the same branch (e.g. restoring working tree)
		const targetBranch = newValue?.replace("ref:refs/heads/", "");
		if (targetBranch === currentBranch) {
			continue;
		}

		// During git worktree add, a new worktree directory is created under
		// .bare/worktrees/ before the HEAD transaction fires, but it won't have
		// a HEAD file yet (this transaction is what creates it). If we detect
		// such a directory, the HEAD update is for the new worktree, not ours.
		if (await isWorktreeBeingCreated()) {
			continue;
		}

		if (protectedBranches.includes(currentBranch)) {
			// Reset index to HEAD without touching the working tree (-u omitted).
			// Git's own rollback handles the working tree; we just fix the index.
			await $`git read-tree --reset HEAD`.quiet().nothrow();

			console.error(
				`error: branch '${currentBranch}' is protected by git-witty.`,
			);
			console.error(
				`Run 'git witty unprotect ${currentBranch}' to allow checkout.`,
			);
			process.exit(1);
		}
	}
}

async function isWorktreeBeingCreated(): Promise<boolean> {
	const commonDir = (
		await $`git rev-parse --git-common-dir`.quiet().nothrow().text()
	).trim();
	const worktreesDir = resolve(commonDir, "worktrees");
	const gitDir = resolve(
		(await $`git rev-parse --git-dir`.quiet().nothrow().text()).trim(),
	);

	if (!existsSync(worktreesDir)) {
		return false;
	}

	for (const entry of readdirSync(worktreesDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) {
			continue;
		}
		const wtDir = resolve(worktreesDir, entry.name);
		if (wtDir === gitDir) {
			continue;
		}
		if (!existsSync(resolve(wtDir, "HEAD"))) {
			return true;
		}
	}

	return false;
}
