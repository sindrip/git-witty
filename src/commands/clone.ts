import { basename, resolve } from "node:path";
import { $ } from "bun";
import { addFolder } from "../workspace";
import { installHook } from "./init";

export async function clone({ url, name }: { url: string; name?: string }) {
	const repoName = repoNameFromUrl(url);
	name ??= repoName;
	const root = resolve(name);
	const bareDir = `${root}/.bare`;

	// Clone as bare repo
	console.log(`Cloning ${url} into ${root}...`);
	await $`git clone --bare ${url} ${bareDir}`;

	// Bare clones need this to fetch all branches
	await $`git -C ${bareDir} config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"`;
	await $`git -C ${bareDir} fetch origin`;

	// Enable reflogs (bare repos don't set this by default)
	await $`git -C ${bareDir} config core.logAllRefUpdates true`;

	// Make the setup portable (can move the folder)
	await $`git -C ${bareDir} config worktree.useRelativePaths true`;

	// Create .git file pointing to the bare repo
	await Bun.write(`${root}/.git`, "gitdir: ./.bare\n");

	// Determine the primary branch
	const primaryBranch = (
		await $`git -C ${bareDir} symbolic-ref --short HEAD`.text()
	).trim();

	// Create the first worktree
	const worktreePath = resolve(root, primaryBranch);
	await $`git -C ${bareDir} worktree add ${worktreePath}`;
	await $`git -C ${worktreePath} branch --set-upstream-to=origin/${primaryBranch}`;
	await addFolder(root, repoName, worktreePath);

	// Install git-witty hooks
	await installHook({ bareDir });

	console.log(`\nReady! Created worktree layout:`);
	console.log(`  ${name}/.bare/          (bare repo)`);
	console.log(`  ${name}/.git            (gitdir pointer)`);
	console.log(`  ${name}/${primaryBranch}/  (worktree)`);
	console.log(`\ncd ${name}/${primaryBranch} to get started.`);
}

function repoNameFromUrl(url: string): string {
	return basename(url).replace(/\.git$/, "");
}
