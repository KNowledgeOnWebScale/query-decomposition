import { strict as assert } from "assert";

import { QueryTree } from "../query-tree/index.js";

export function rewriteUnionToAboveUnaryOp(parentUnary: QueryTree.UnaryOp, unionOp: QueryTree.Union): QueryTree.Union {
    assert(parentUnary.input === unionOp);

    const newSubOps = unionOp.input.map(subOp => {
        return { ...structuredClone(parentUnary), input: subOp };
    }) satisfies QueryTree.Union["input"];

    const newParent = parentUnary as QueryTree.Operation;
    newParent.type = QueryTree.types.UNION;
    newParent.input = newSubOps;
    return newParent as QueryTree.Union;
}

export function rewriteUnionToAboveBinaryOrMoreOp(
    parentBinary: QueryTree.BinaryOrMoreOp,
    unionOp: QueryTree.Union,
): QueryTree.Union {
    const childIdx = parentBinary.input.indexOf(unionOp);
    assert(childIdx !== -1);

    const newSubOps = unionOp.input.map(unionOperand => {
        const newSubOp = structuredClone(parentBinary);
        replaceChildAtIdx(newSubOp, childIdx, unionOperand);
        return newSubOp;
    }) satisfies QueryTree.Union["input"];

    const newParent = parentBinary as QueryTree.Operation;
    newParent.type = QueryTree.types.UNION;
    newParent.input = newSubOps;
    return newParent as QueryTree.Union;
}

function replaceChildAtIdx(parent: QueryTree.BinaryOrMoreOp, childIdx: number, newChild: QueryTree.Operand) {
    if (parent.type === newChild.type && parent.type === QueryTree.types.JOIN) {
        // Associative property
        parent.input.splice(childIdx, 1, ...structuredClone(newChild.input));
    } else {
        parent.input.splice(childIdx, 1, structuredClone(newChild));
    }
}
