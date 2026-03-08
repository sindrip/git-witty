import { clone } from "./commands/clone";

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
	case "clone":
		await clone(args.slice(1));
		break;
	default:
		console.error(
			command ? `Unknown command: ${command}` : "Usage: git witty <command>",
		);
		console.error("\nCommands:");
		console.error(
			"  clone <url> [name]   Clone a repo into a worktree-friendly layout",
		);
		process.exit(1);
}
