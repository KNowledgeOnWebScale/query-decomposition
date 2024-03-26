import { strict as assert } from "assert";

import type { Algebra } from "../query-tree/index.js";

export function replaceChild(parent: Algebra.Operation, oldChild: Algebra.Operand, newChild: Algebra.Operand) {
    if (Array.isArray(parent.input)) {
        const childIdx = parent.input.indexOf(oldChild);
        assert(childIdx !== -1);
        parent.input[childIdx] = newChild;
    } else {
        parent.input = newChild;
    }
}
