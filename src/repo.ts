import { dirname } from "node:path";
import { $ } from "bun";

/**
 * Returns the root directory of the witty repo layout (the parent of .bare/).
 */
export async function getRepoRoot(): Promise<string> {
	const gitCommonDir = (await $`git rev-parse --git-common-dir`.text()).trim();

	// gitCommonDir points to .bare — the repo root is its parent
	return dirname(gitCommonDir);
}
