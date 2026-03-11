import { basename } from "node:path";
import { Git } from "../git";
import { syncWorkspace } from "../workspace";

export async function remove(branch: string) {
	const git = await new Git().root();
	const root = await git.rootDir();
	await git.worktree("remove", branch);
	await syncWorkspace(root, basename(root));
}
