import { strict as assert } from "assert";

import { Algebra } from "../query-tree/index.js";

export function rewriteUnionToAboveUnaryOp(parentUnary: Algebra.UnaryOp, unionOp: Algebra.Union): Algebra.Union {
    assert(parentUnary.input === unionOp);

    const newSubOps = unionOp.input.map(subOp => {
        return { ...structuredClone(parentUnary), input: subOp };
    }) satisfies Algebra.Union["input"];

    const newParent = parentUnary as Algebra.Operation;
    newParent.type = Algebra.types.UNION;
    newParent.input = newSubOps;
    return newParent as Algebra.Union;
}

export function rewriteUnionToAboveBinaryOp(
    parentBinary: Algebra.BinaryOrMoreOp,
    unionOp: Algebra.Union,
): Algebra.Union {
    const childIdx = parentBinary.input.indexOf(unionOp);
    assert(childIdx !== -1);

    const newSubOps = unionOp.input.map(unionOperand => {
        const newSubOp = structuredClone(parentBinary);
        replaceChildAtIdx(newSubOp, childIdx, unionOperand);
        return newSubOp;
    }) satisfies Algebra.Union["input"];

    const newParent = parentBinary as Algebra.Operation;
    newParent.type = Algebra.types.UNION;
    newParent.input = newSubOps;
    return newParent as Algebra.Union;
}

function replaceChildAtIdx(parent: Algebra.BinaryOrMoreOp, childIdx: number, newChild: Algebra.Operand) {
    if (parent.type === newChild.type && parent.type === Algebra.types.JOIN) {
        // Associative property
        parent.input.splice(childIdx, 1, ...structuredClone(newChild.input));
    } else {
        parent.input.splice(childIdx, 1, structuredClone(newChild));
    }
}
