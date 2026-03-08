import { Command } from "commander";
import { clone, init, protect, unprotect } from "./commands";
import { referenceTransaction } from "./hooks";

const program = new Command()
	.name("git witty")
	.description("Worktree-friendly git workflow tool");

program
	.command("clone")
	.description("Clone a repo into a worktree-friendly layout")
	.argument("<url>", "Repository URL to clone")
	.argument("[name]", "Directory name for the clone")
	.action((url, name) => clone({ url, name }));

program
	.command("protect")
	.description("Protect branches from checkout in all worktrees")
	.argument("[branches...]", "Branches to protect")
	.action((branches) => protect({ branches }));

program
	.command("unprotect")
	.description("Remove branch protection")
	.argument("<branches...>", "Branches to unprotect")
	.action((branches) => unprotect({ branches }));

program
	.command("init")
	.description("Install git-witty hooks into the repository")
	.action(() => init());

const hook = program
	.command("hook", { hidden: true })
	.description("Internal hook dispatcher");

hook
	.command("reference-transaction")
	.argument("<state>", "Transaction state")
	.action((state) => referenceTransaction(state));

program.parse();
