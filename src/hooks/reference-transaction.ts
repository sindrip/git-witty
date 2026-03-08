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

		if (protectedBranches.includes(currentBranch)) {
			// Restore index and working tree before aborting — HEAD hasn't moved yet
			const readTree = await $`git read-tree --reset -u HEAD`
				.quiet()
				.nothrow();
			if (readTree.exitCode !== 0) {
				console.error(
					"warning: failed to restore working tree. Run 'git checkout HEAD -- .' to recover.",
				);
			}

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
