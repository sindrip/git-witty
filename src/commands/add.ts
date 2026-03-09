import { join } from "node:path";
import { $ } from "bun";
import { getRepoName, getRepoRoot } from "../repo";
import { addFolder } from "../workspace";

export async function add({ branch }: { branch: string }) {
	const root = await getRepoRoot();
	const repoName = await getRepoName();
	const worktreePath = join(root, branch);

	await $`git worktree add ${worktreePath}`;
	await $`git -C ${worktreePath} branch --set-upstream-to=origin/${branch}`
		.quiet()
		.nothrow();
	await addFolder(root, repoName, worktreePath);
}
