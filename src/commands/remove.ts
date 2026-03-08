import { join } from "node:path";
import { $ } from "bun";
import { getRepoRoot } from "../repo";
import { removeFolder } from "../workspace";

export async function remove({ branch }: { branch: string }) {
	const root = await getRepoRoot();
	const worktreePath = join(root, branch);

	await $`git worktree remove ${worktreePath}`;
	await removeFolder(root, worktreePath);
}
