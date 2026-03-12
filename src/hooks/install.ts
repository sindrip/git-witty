import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { hooks } from "./index";

const TRAMPOLINE = `#!/usr/bin/env sh
exec git witty hook "$(basename "$0")" "$@"
`;

export async function installHook(bareDir: string) {
	for (const hook of Object.keys(hooks)) {
		const hookPath = join(bareDir, "hooks", hook);
		await Bun.write(hookPath, TRAMPOLINE);
		await chmod(hookPath, 0o755);
	}
}
