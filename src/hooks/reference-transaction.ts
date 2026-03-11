import { Git } from "../git";

const NULL_SHA = "0000000000000000000000000000000000000000";

export async function referenceTransaction(state: string) {
	if (state !== "prepared") return;

	const git = await new Git().root();
	const protectedBranches = await git.config.getAll("witty.protect");
	if (protectedBranches.length === 0) return;

	const input = await Bun.stdin.text();
	for (const line of input.trim().split("\n")) {
		const [, newValue, ref] = line.split(" ");
		if (newValue !== NULL_SHA) continue;
		if (!ref?.startsWith("refs/heads/")) continue;

		const branch = ref.slice("refs/heads/".length);
		if (protectedBranches.includes(branch)) {
			console.error(
				`error: deletion of branch '${branch}' is blocked by git-witty.`,
			);
			console.error("Run 'git witty protect' to manage protected branches.");
			process.exit(1);
		}
	}
}
