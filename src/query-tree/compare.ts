import hash from "object-hash";

import * as Algebra from "./algebra.js";

function areUnorderedEqual<T>(a: T[], b: T[], compareElementsCb: (x: T, y: T) => boolean) {
    return a.length === b.length && a.every(x => b.some(y => compareElementsCb(x, y)));
}

function areOrderedEqual<T>(a: T[], b: T[], compareElementsCb: (x: T, y: T) => boolean) {
    return a.length === b.length && a.every((x, idx) => compareElementsCb(x, b[idx]));
}

export function areEqualOps(a: Algebra.Operand, b_: Algebra.Operand): boolean {
    if (a.type !== b_.type) {
        return false;
    }

    // Compare hashes of objects that have to match exactly
    const hashOrUndefined = (x: hash.NotUndefined | undefined) => (x !== undefined ? hash(x) : x);

    // Type narrowing doesn't currently affect the shared generic
    switch (a.type) {
        case Algebra.types.PROJECT: {
            const b = b_ as Algebra.Project;

            return (
                areUnorderedEqual(a.variables, b.variables, (a, b) => hash(a) === hash(b)) &&
                areEqualOps(a.input, b.input)
            );
        }
        case Algebra.types.UNION:
        case Algebra.types.JOIN: {
            const b = b_ as Algebra.Union | Algebra.Join;

            return areUnorderedEqual(a.input, b.input, areEqualOps);
        }
        case Algebra.types.LEFT_JOIN: {
            const b = b_ as Algebra.LeftJoin;

            return (
                hashOrUndefined(a.expression) === hashOrUndefined(b.expression) &&
                areOrderedEqual(a.input, b.input, areEqualOps)
            );
        }
        case Algebra.types.MINUS: {
            const b = b_ as Algebra.Minus;

            return areOrderedEqual(a.input, b.input, areEqualOps);
        }
        case Algebra.types.BGP: {
            const b = b_ as Algebra.Bgp;

            return areUnorderedEqual(a.patterns, b.patterns, (a, b) => hash(a) === hash(b));
        }
        case Algebra.types.FILTER: {
            const b = b_ as Algebra.Filter;

            return hash(a.expression) === hash(b.expression) && areEqualOps(a.input, b.input);
        }
    }
}
