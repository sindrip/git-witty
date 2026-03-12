import { Git, PROTECT_CONFIG_KEY } from "../git";

export async function prePush(_remote: string, _url: string) {
	const git = await new Git().root();
	const protectedBranches = await git.config.getAll(PROTECT_CONFIG_KEY);
	if (protectedBranches.length === 0) return;

	const input = await Bun.stdin.text();
	for (const line of input.trim().split("\n")) {
		if (!line) continue;
		const [localRef] = line.split(" ");
		if (!localRef?.startsWith("refs/heads/")) continue;

		const branch = localRef.slice("refs/heads/".length);
		if (protectedBranches.includes(branch)) {
			console.error(
				`error: push to protected branch '${branch}' is blocked by git-witty.`,
			);
			console.error("Run 'git witty protect' to manage protected branches.");
			process.exit(1);
		}
	}
}
