import { join } from "node:path";
import { $ } from "bun";
import { getRepoRoot } from "../repo";
import { addFolder } from "../workspace";

export async function add({ branch }: { branch: string }) {
	const root = await getRepoRoot();
	const worktreePath = join(root, branch);

	await $`git worktree add ${worktreePath} ${branch}`;
	await addFolder(root, worktreePath);
}
