import hash from "object-hash";

import {
    types,
    type Bgp,
    type Filter,
    type Join,
    type LeftJoin,
    type Minus,
    type Operation,
    type Project,
    type Union,
} from "./algebra.js";

function haveEqualOpType<A extends Operation>(a: A, b: Operation): b is A {
    return a.type === b.type;
}

export function areEqualOps(a: Operation, b_: Operation): boolean {
    if (!haveEqualOpType(a, b_)) {
        return false;
    }

    const areOpsUnorderedEqual = (inp1: Operation[], inp2: Operation[]) =>
        inp1.length === inp2.length && inp1.every(x => inp2.some(y => areEqualOps(y, x)));
    const areOpsOrderedEqual = (inp1: Operation[], inp2: Operation[]) =>
        inp1.length === inp2.length && inp1.every((x, idx) => areEqualOps(x, inp2[idx]));

    // Compare hashes of objects that have to match exactly
    const hashOrUndefined = (x: hash.NotUndefined | undefined) => (x !== undefined ? hash(x) : x);

    // Type narrowing doesn't currently affect the shared generic
    switch (a.type) {
        case types.PROJECT: {
            const b = b_ as Project;

            return a.variables.every(x => b.variables.some(y => y.equals(x))) && areEqualOps(a.input, b.input);
        }
        case types.UNION:
        case types.JOIN: {
            const b = b_ as Union | Join;

            return areOpsUnorderedEqual(a.input, b.input);
        }
        case types.LEFT_JOIN: {
            const b = b_ as LeftJoin;

            return (
                hashOrUndefined(a.expression as hash.NotUndefined | undefined) ===
                    hashOrUndefined(b.expression as hash.NotUndefined | undefined) &&
                areOpsOrderedEqual(a.input, b.input)
            );
        }
        case types.MINUS: {
            const b = b_ as Minus;

            return areOpsOrderedEqual(a.input, b.input);
        }
        case types.BGP: {
            const b = b_ as Bgp;

            return a.patterns.every(x => b.patterns.find(y => y.equals(x)));
        }
        case types.FILTER: {
            const b = b_ as Filter;

            return (
                hash(a.expression as hash.NotUndefined) === hash(b.expression as hash.NotUndefined) &&
                areEqualOps(a.input, b.input)
            );
        }
    }
}
