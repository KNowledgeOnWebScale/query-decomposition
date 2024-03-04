import { strict as assert } from 'assert';
import { type Algebra } from 'sparqlalgebrajs';

type UnaryOp = Algebra.Operation & Algebra.Single
type BinaryOp = Algebra.Operation & Algebra.Multi

// TODO: enable https://eslint.org/docs/latest/rules/no-param-reassign for these
export function liftBinaryAboveUnary<U extends UnaryOp, B extends BinaryOp>(parentUnary: U, childBinary: B): B {
    assert(parentUnary.input == childBinary);

    assert(childBinary.input.length == 2); // only binary op for now

    const newSubOps = new Array<U>();
    for (const opArg of childBinary.input) {
        const newOp = structuredClone(parentUnary);
        newOp.input = opArg;
        newSubOps.push(newOp);
    }

    return {...structuredClone(childBinary), input: newSubOps}
}

// TODO: enable https://eslint.org/docs/latest/rules/no-param-reassign for these
export function liftBinaryAboveBinary<B1 extends BinaryOp, B2 extends BinaryOp>(parentBinary: B1, childBinary: B2): B2 {
    assert(parentBinary.input.length == 2); // only binary op for now
    assert(childBinary.input.length == 2); // only binary op for now

    //assert((parentBinary.input).includes(childBinary));

    const childIdx = parentBinary.input[0] == childBinary ? 0 : 1;
    const notChildIdx = parentBinary.input[0] == childBinary ? 1 : 0;

    const newSubOp1 = {...structuredClone(parentBinary), input: new Array<Algebra.Operation>()};
    newSubOp1.input[childIdx] = childBinary.input[0]
    newSubOp1.input[notChildIdx] = parentBinary.input[notChildIdx]

    const newSubOp2 = {...structuredClone(parentBinary), input: new Array<Algebra.Operation>()};
    newSubOp2.input[childIdx] = childBinary.input[1]
    newSubOp2.input[notChildIdx] = parentBinary.input[notChildIdx]



    return {...structuredClone(childBinary), input: [newSubOp1, newSubOp2]};
}