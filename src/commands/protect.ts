import { $ } from "bun";

export async function protect({ branches }: { branches: string[] }) {
	const existing = await getProtectedBranches();

	const worktreeOutput = (
		await $`git worktree list --porcelain`.quiet().nothrow().text()
	).trim();
	const checkedOutBranches = new Set(
		worktreeOutput
			.split("\n")
			.filter((line) => line.startsWith("branch refs/heads/"))
			.map((line) => line.slice("branch refs/heads/".length)),
	);

	for (const branch of branches) {
		if (!checkedOutBranches.has(branch)) {
			console.error(`Branch '${branch}' is not checked out in any worktree.`);
			process.exit(1);
		}

		if (existing.includes(branch)) {
			continue;
		}

		await $`git config --add witty.protect ${branch}`;
		existing.push(branch);
		console.log(`Protected branch: ${branch}`);
	}
}

export async function unprotect({ branches }: { branches: string[] }) {
	const existing = await getProtectedBranches();

	for (const branch of branches) {
		if (!existing.includes(branch)) {
			console.error(`Branch '${branch}' is not protected.`);
			process.exit(1);
		}

		await $`git config --unset witty.protect ${branch}`;
	}
}

export async function getProtectedBranches(): Promise<string[]> {
	try {
		const result = (await $`git config --get-all witty.protect`.text()).trim();
		return result ? result.split("\n") : [];
	} catch {
		return [];
	}
}
