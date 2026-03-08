import { $ } from "bun";
import { getProtectedBranches } from "./protect";

interface Worktree {
	path: string;
	head: string;
	branch?: string;
	bare: boolean;
	locked: boolean;
}

function parsePorcelain(output: string): Worktree[] {
	const blocks = output.trim().split("\n\n");
	return blocks.map((block) => {
		const lines = block.split("\n");
		const worktree: Worktree = {
			path: "",
			head: "",
			bare: false,
			locked: false,
		};

		for (const line of lines) {
			if (line.startsWith("worktree ")) {
				worktree.path = line.slice("worktree ".length);
			} else if (line.startsWith("HEAD ")) {
				worktree.head = line.slice("HEAD ".length);
			} else if (line.startsWith("branch ")) {
				worktree.branch = line.slice("branch refs/heads/".length);
			} else if (line === "bare") {
				worktree.bare = true;
			} else if (line === "locked") {
				worktree.locked = true;
			}
		}

		return worktree;
	});
}

export async function list() {
	const output = await $`git worktree list --porcelain`.text();
	const worktrees = parsePorcelain(output);
	const protectedBranches = await getProtectedBranches();

	const maxPathLen = Math.max(...worktrees.map((w) => w.path.length));

	for (const wt of worktrees) {
		const path = wt.path.padEnd(maxPathLen);

		if (wt.bare) {
			const parts = [path, " (bare)"];
			console.log(parts.join(""));
			continue;
		}

		const shortHead = wt.head.slice(0, 7);
		const branchTag = wt.branch ? ` [${wt.branch}]` : "";
		const annotations: string[] = [];

		if (wt.locked) annotations.push("locked");
		if (wt.branch && protectedBranches.includes(wt.branch))
			annotations.push("protected");

		const suffix = annotations.length > 0 ? ` ${annotations.join(", ")}` : "";
		console.log(`${path} ${shortHead}${branchTag}${suffix}`);
	}
}
