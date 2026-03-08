import { basename, resolve } from "node:path";
import { $ } from "bun";
import { installHook } from "./init";

export async function clone({ url, name }: { url: string; name?: string }) {
	name ??= repoNameFromUrl(url);
	const root = resolve(name);
	const bareDir = `${root}/.bare`;

	// Clone as bare repo
	console.log(`Cloning ${url} into ${root}...`);
	await $`git clone --bare ${url} ${bareDir}`;

	// Create .git file pointing to the bare repo
	await Bun.write(`${root}/.git`, "gitdir: ./.bare\n");

	// Determine the primary branch
	const primaryBranch = (
		await $`git -C ${bareDir} symbolic-ref --short HEAD`.text()
	).trim();

	// Create the first worktree
	await $`git -C ${bareDir} worktree add ${resolve(root, primaryBranch)} ${primaryBranch}`;

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
