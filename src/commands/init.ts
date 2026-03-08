import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";

const TRAMPOLINE = `#!/usr/bin/env sh
exec git witty hook "$(basename "$0")" "$@"
`;

export async function init() {
	await installHook();
}

export async function installHook({ bareDir }: { bareDir?: string } = {}) {
	bareDir ??= (await $`git rev-parse --git-common-dir`.text()).trim();
	const hookPath = join(bareDir, "hooks", "reference-transaction");

	await Bun.write(hookPath, TRAMPOLINE);
	await chmod(hookPath, 0o755);
	console.log(`Installed reference-transaction hook at ${hookPath}`);
}
