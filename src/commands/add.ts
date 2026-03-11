import { basename, join } from "node:path";
import { Git } from "../git";
import { syncWorkspace } from "../workspace";

export async function add(branch: string) {
	const git = await new Git().root();
	const root = await git.rootDir();
	await git.worktree("add", join(branch));
	await git
		.C(branch)
		.exec("branch", `--set-upstream-to=origin/${branch}`)
		.nothrow()
		.quiet();
	await syncWorkspace(root, basename(root));
}
