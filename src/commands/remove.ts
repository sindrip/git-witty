import { Git } from "../git";
import { syncWorkspace } from "../workspace";

export async function remove(branch: string) {
	const git = await new Git().root();
	const root = await git.rootDir();
	const repoName = await git.repoName();
	await git.worktree("remove", branch);
	await syncWorkspace(root, repoName);
}
