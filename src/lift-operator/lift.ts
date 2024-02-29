import { strict as assert } from 'assert';
import { type Algebra } from 'sparqlalgebrajs';

type UnaryOp = Algebra.Operation & Algebra.Single
type BinaryOp = Algebra.Operation & Algebra.Multi

export function liftBinaryAboveUnary<U extends UnaryOp, B extends BinaryOp>(parentUnary: U, childBinary: B): B {
    //assert(parentUnary.input == childBinary);

    assert(childBinary.input.length == 2); // only binary op for now

    let newSubOps = new Array<U>();
    for (const opArg of childBinary.input) {
        const newOp = structuredClone(parentUnary);
        newOp.input = opArg;
        newSubOps.push(newOp);
    }

    childBinary.input = newSubOps
    return childBinary
}

export function liftBinaryAboveBinary<B1 extends BinaryOp, B2 extends BinaryOp>(parentBinary: B1, childBinary: B2): B2 {
    assert(parentBinary.input.length == 2); // only binary op for now
    assert(childBinary.input.length == 2); // only binary op for now

    //assert((parentBinary.input).includes(childBinary));

    let notChildIdx = parentBinary.input[0] == childBinary ? 1 : 0;

    let newSubOp1 = structuredClone(parentBinary);
    newSubOp1.input = [
        childBinary.input[0],
        parentBinary.input[notChildIdx],
    ]
    let newSubOp2 = structuredClone(parentBinary);
    newSubOp2.input = [
        childBinary.input[1],
        parentBinary.input[notChildIdx],
    ]

    childBinary.input = [newSubOp1, newSubOp2];
    return childBinary;
}