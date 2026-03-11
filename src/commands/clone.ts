import { basename, join, resolve } from "node:path";
import { BARE_DIR, GITDIR_POINTER, Git } from "../git";
import { installHook } from "../hooks";
import { syncWorkspace } from "../workspace";

export interface CloneResult {
	root: string;
	name: string;
	primaryBranch: string;
}

export async function clone({
	url,
	name,
}: {
	url: string;
	name?: string;
}): Promise<CloneResult> {
	name ??= basename(url).replace(/\.git$/, "");
	const root = resolve(name);
	const bareDir = join(root, BARE_DIR);
	const git = new Git();

	await git.clone(url, bareDir);

	const bare = git.C(bareDir);
	await bare.config.set(
		"remote.origin.fetch",
		"+refs/heads/*:refs/remotes/origin/*",
	);
	await bare.exec("fetch", "origin");
	await bare.config.set("core.logAllRefUpdates", "true");
	await bare.config.set("worktree.useRelativePaths", "true");

	await Bun.write(join(root, ".git"), GITDIR_POINTER);

	const primaryBranch = (
		await bare.exec("symbolic-ref", "--short", "HEAD").text()
	).trim();

	const rootGit = git.C(root);
	await rootGit.worktree("add", primaryBranch);
	await rootGit
		.C(primaryBranch)
		.exec("branch", `--set-upstream-to=origin/${primaryBranch}`);

	await installHook(bareDir);

	await syncWorkspace(root, name);

	return { root, name, primaryBranch };
}
