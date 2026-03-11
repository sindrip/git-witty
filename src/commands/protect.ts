import * as p from "@clack/prompts";
import { Git, type GitConfig } from "../git";

export async function syncProtected(
	current: string[],
	selected: string[],
	config: GitConfig,
) {
	const toAdd = selected.filter((b) => !current.includes(b));
	const toRemove = current.filter((b) => !selected.includes(b));

	for (const branch of toAdd) {
		await config.add("witty.protect", branch);
	}
	for (const branch of toRemove) {
		await config.unset("witty.protect", `^${branch}$`);
	}
}

export async function protect() {
	const git = await new Git().root();
	const branches = await git.listBranches();
	const currentProtected = await git.config.getAll("witty.protect");

	const selected = await p.multiselect({
		message: "Select branches to protect",
		options: [...branches]
			.sort((a, b) => {
				const aP = currentProtected.includes(a) ? 0 : 1;
				const bP = currentProtected.includes(b) ? 0 : 1;
				return aP - bP;
			})
			.map((b) => ({
				value: b,
				label: b,
			})),
		initialValues: currentProtected,
		required: false,
	});

	if (p.isCancel(selected)) {
		p.cancel("No changes made.");
		process.exit(0);
	}

	await syncProtected(currentProtected, selected, git.config);
}
