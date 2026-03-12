import { prePush } from "./pre-push";
import { referenceTransaction } from "./reference-transaction";

export { installHook } from "./install";

export const hooks: Record<
	string,
	(...args: string[]) => void | Promise<void>
> = {
	"reference-transaction": referenceTransaction,
	"pre-push": prePush,
};
