import { chmod } from "node:fs/promises";
import { join } from "node:path";

const TRAMPOLINE = `#!/usr/bin/env sh
exec git witty hook "$(basename "$0")" "$@"
`;

export async function installHook(bareDir: string) {
	const hookPath = join(bareDir, "hooks", "reference-transaction");
	await Bun.write(hookPath, TRAMPOLINE);
	await chmod(hookPath, 0o755);
}
