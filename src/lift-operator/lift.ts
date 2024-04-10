import { strict as assert } from "assert";

import { Algebra } from "../query-tree/index.js";

import type { ArrayMinLength } from "../utils.js";

export function liftUnionAboveUnaryOp<U extends Algebra.UnaryOp>(
    parentUnary: U,
    unionOp: Algebra.Union,
): Algebra.Union {
    assert(parentUnary.input === unionOp);

    const newSubOps = unionOp.input.map(subOp => {
        return { ...structuredClone(parentUnary), input: subOp };
    }) as ArrayMinLength<U, 2>;

    return { ...structuredClone(unionOp), input: newSubOps };
}

function replaceChildAtIdx(parent: Algebra.BinaryOrMoreOp, childIdx: number, newChild: Algebra.Operand) {
    if (parent.type === Algebra.types.JOIN && newChild.type === Algebra.types.JOIN) {
        // Associative property
        parent.input.splice(childIdx, 1, ...structuredClone(newChild.input));
    } else {
        parent.input.splice(childIdx, 1, structuredClone(newChild));
    }
}

export function liftUnionAboveBinaryOp<B extends Algebra.BinaryOp | Algebra.BinaryOrMoreOp>(
    parentBinary: B,
    unionOp: Algebra.Union,
): Algebra.Union {
    assert(parentBinary.input.includes(unionOp));

    const childIdx = parentBinary.input.indexOf(unionOp);

    const newSubOps = new Array<B>();
    for (const unionOperand of unionOp.input) {
        const newSubOp = structuredClone(parentBinary);
        replaceChildAtIdx(newSubOp, childIdx, unionOperand);
        newSubOps.push(newSubOp);
    }

    return { ...structuredClone(unionOp), input: newSubOps as ArrayMinLength<B, 2> };
}
