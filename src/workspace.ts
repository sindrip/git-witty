import { relative } from "node:path";
import { Git } from "./git";

interface WorkspaceFolder {
	path: string;
}

interface WorkspaceFile {
	folders: WorkspaceFolder[];
	[key: string]: unknown;
}

async function read(path: string): Promise<WorkspaceFile> {
	const file = Bun.file(path);
	if (await file.exists()) {
		return Bun.JSONC.parse(await file.text()) as WorkspaceFile;
	}
	return { folders: [] };
}

async function write(path: string, workspace: WorkspaceFile): Promise<void> {
	await Bun.write(path, `${JSON.stringify(workspace, null, "\t")}\n`);
}

export async function syncWorkspace(root: string, repoName: string) {
	const wsPath = `${root}/${repoName}.code-workspace`;
	const workspace = await read(wsPath);

	const git = new Git().C(root);
	const worktrees = await git.listWorktrees();
	workspace.folders = worktrees.map((w) => ({
		path: relative(root, w.path),
	}));

	await write(wsPath, workspace);
}
