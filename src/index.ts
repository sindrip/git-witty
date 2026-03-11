import { Command } from "commander";
import { add, clone, protect, remove } from "./commands";
import { Git } from "./git";
import { referenceTransaction } from "./hooks";

const program = new Command()
	.name("git witty")
	.description("Worktree-friendly git workflow tool");

program
	.command("clone")
	.description("Clone a repo into a worktree-friendly layout")
	.argument("<url>", "Repository URL to clone")
	.argument("[name]", "Directory name for the clone")
	.action(async (url, name) => {
		const result = await clone({ url, name });
		console.log(`\nReady! Created worktree layout:`);
		console.log(`  ${result.name}/.bare/          (bare repo)`);
		console.log(`  ${result.name}/.git            (gitdir pointer)`);
		console.log(`  ${result.name}/${result.primaryBranch}/  (worktree)`);
		console.log(`\ncd ${result.name}/${result.primaryBranch} to get started.`);
	});

program
	.command("protect")
	.description("Interactively select branches to protect from worktree removal")
	.action(async () => {
		await protect();
	});

program
	.command("add")
	.description("Add a new worktree")
	.argument("<branch>")
	.allowUnknownOption()
	.allowExcessArguments()
	.action(async (branch) => {
		await add(branch);
	});

program
	.command("remove")
	.description("Remove a worktree")
	.argument("<branch>")
	.allowUnknownOption()
	.allowExcessArguments()
	.action(async (branch) => {
		await remove(branch);
	});

const hook = program.command("hook", { hidden: true });
hook
	.command("reference-transaction")
	.argument("<state>")
	.action((state: string) => referenceTransaction(state));

const passthroughCommands = [
	"list",
	"lock",
	"unlock",
	"move",
	"prune",
	"repair",
];

for (const cmd of passthroughCommands) {
	program
		.command(cmd)
		.description(`Passthrough to git worktree ${cmd}`)
		.allowUnknownOption()
		.allowExcessArguments()
		.action(async (_options, command) => {
			const args = command.args as string[];
			const git = new Git();
			const result = await git.worktree(cmd, ...args).nothrow();
			process.exit(result.exitCode);
		});
}

program.parse();
