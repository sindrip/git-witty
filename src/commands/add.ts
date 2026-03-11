import { join } from "node:path";
import { Git } from "../git";
import { syncWorkspace } from "../workspace";

export async function add(branch: string) {
	const git = await new Git().root();
	const root = await git.rootDir();
	const repoName = await git.repoName();
	await git.worktree("add", join(root, branch));
	await git
		.C(join(root, branch))
		.exec("branch", `--set-upstream-to=origin/${branch}`)
		.nothrow()
		.quiet();
	await syncWorkspace(root, repoName);
}
