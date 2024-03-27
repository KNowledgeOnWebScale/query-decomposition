import { strict as assert } from "assert";

import { Algebra } from "../query-tree/index.js";
import type { ArrayMinLength } from "../utils.js";

export function liftSeqOfBinaryAboveUnary<U extends Algebra.UnaryOp, B extends Algebra.BinaryOp | Algebra.MultiOp>(
    parentUnary: U,
    childBinary: B,
): B {
    assert(parentUnary.input === childBinary);

    const newSubOps = childBinary.input.map(subOp => {
        return { ...structuredClone(parentUnary), input: subOp };
    }) as ArrayMinLength<U, 2>;

    return { ...structuredClone(childBinary), input: newSubOps };
}

function replaceChildAtIdx(parent: Algebra.MultiOp, childIdx: number, newChild: Algebra.Operand) {
    if (parent.type === Algebra.types.JOIN && newChild.type === Algebra.types.JOIN) {
        // Associative property
        parent.input.splice(childIdx, 1, ...structuredClone(newChild.input));
    } else {
        parent.input.splice(childIdx, 1, structuredClone(newChild));
    }
}

export function liftSeqOfBinaryAboveBinary<
    B1 extends Algebra.BinaryOp | Algebra.MultiOp,
    B2 extends Algebra.BinaryOp | Algebra.MultiOp,
>(parentBinary: B1, childBinary: B2): B2 {
    assert(parentBinary.input.includes(childBinary));

    const childIdx = parentBinary.input.indexOf(childBinary);

    const newSubOp1 = structuredClone(parentBinary);
    replaceChildAtIdx(newSubOp1, childIdx, childBinary.input[0]);

    const newSubOp2 = structuredClone(parentBinary);
    if (childBinary.input.length === 2) {
        replaceChildAtIdx(newSubOp2, childIdx, structuredClone(childBinary.input[1]));
    } else {
        replaceChildAtIdx(newSubOp2, childIdx, {
            ...structuredClone(childBinary),
            input: structuredClone(childBinary.input.slice(1)),
        });
    }

    return { ...structuredClone(childBinary), input: [newSubOp1, newSubOp2] };
}
