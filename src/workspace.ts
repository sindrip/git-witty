import { basename, relative } from "node:path";

interface WorkspaceFolder {
	path: string;
}

interface WorkspaceFile {
	folders: WorkspaceFolder[];
	[key: string]: unknown;
}

export function workspacePath(root: string): string {
	return `${root}/${basename(root)}.code-workspace`;
}

async function read(path: string): Promise<WorkspaceFile> {
	const file = Bun.file(path);
	if (await file.exists()) {
		return (await file.json()) as WorkspaceFile;
	}
	return { folders: [] };
}

async function write(path: string, workspace: WorkspaceFile): Promise<void> {
	await Bun.write(path, `${JSON.stringify(workspace, null, "\t")}\n`);
}

export async function addFolder(
	root: string,
	worktreePath: string,
): Promise<void> {
	const wsPath = workspacePath(root);
	const workspace = await read(wsPath);

	const rel = relative(root, worktreePath);

	if (workspace.folders.some((f) => f.path === rel)) {
		return;
	}

	workspace.folders.push({ path: rel });
	await write(wsPath, workspace);
}

export async function removeFolder(
	root: string,
	worktreePath: string,
): Promise<void> {
	const wsPath = workspacePath(root);
	const workspace = await read(wsPath);

	const rel = relative(root, worktreePath);
	workspace.folders = workspace.folders.filter((f) => f.path !== rel);
	await write(wsPath, workspace);
}
