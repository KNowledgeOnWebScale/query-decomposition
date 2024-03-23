import { strict as assert } from "assert";

import { Algebra } from "sparqlalgebrajs";

export type UnaryOp = Algebra.Operation & Algebra.Single;
export type BinaryOp = Algebra.Operation & Algebra.Multi;

export function liftSeqOfBinaryAboveUnary<U extends UnaryOp, B extends BinaryOp>(parentUnary: U, childBinary: B): B {
    assert(parentUnary.input === childBinary);

    const newSubOps = childBinary.input.map(subOp => {
        const t = { ...structuredClone(parentUnary), input: subOp };
        // if (t.type == Algebra.types.PROJECT) {
        //     t.variables = Util.inScopeVariables(t.input);
        // }
        return t;
    });
    return { ...structuredClone(childBinary), input: newSubOps };
}

export function liftSeqOfBinaryAboveBinary<B1 extends BinaryOp, B2 extends BinaryOp>(
    parentBinary: B1,
    childBinary: B2,
): B2 {
    assert(parentBinary.input.length >= 2);
    assert(childBinary.input.length >= 2);
    assert(parentBinary.input.includes(childBinary));

    const childIdx = parentBinary.input.indexOf(childBinary);

    const newSubOp1 = structuredClone(parentBinary);
    newSubOp1.input.splice(childIdx, 1, childBinary.input[0]);

    const newSubOp2 = structuredClone(parentBinary);
    if (childBinary.input.length === 2) {
        newSubOp2.input.splice(childIdx, 1, childBinary.input[1]);
    } else {
        newSubOp2.input.splice(childIdx, 1, { ...structuredClone(childBinary), input: childBinary.input.slice(1) });
    }

    return { ...structuredClone(childBinary), input: [newSubOp1, newSubOp2] };
}
