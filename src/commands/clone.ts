import { basename, resolve } from "node:path";
import { $ } from "bun";

export async function clone(args: string[]) {
	const url = args[0];
	if (!url) {
		console.error("Usage: git witty clone <url> [name]");
		process.exit(1);
	}

	const name = args[1] ?? repoNameFromUrl(url);
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

	console.log(`\nReady! Created worktree layout:`);
	console.log(`  ${name}/.bare/          (bare repo)`);
	console.log(`  ${name}/.git            (gitdir pointer)`);
	console.log(`  ${name}/${primaryBranch}/  (worktree)`);
	console.log(`\ncd ${name}/${primaryBranch} to get started.`);
}

function repoNameFromUrl(url: string): string {
	return basename(url).replace(/\.git$/, "");
}
