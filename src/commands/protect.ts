import { $ } from "bun";

export async function protect({ branches }: { branches: string[] }) {
	const existing = await getProtectedBranches();

	for (const branch of branches) {
		const { exitCode } = await $`git rev-parse --verify refs/heads/${branch}`
			.quiet()
			.nothrow();
		if (exitCode !== 0) {
			console.error(`Branch '${branch}' does not exist.`);
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
