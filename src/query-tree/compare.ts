import hash from "object-hash";

import * as Algebra from "./algebra.js";
import { inScopeVariables } from "./utils.js";

function areUnorderedEqual<T>(a: readonly T[], b: readonly T[], compareElementsCb: (x: T, y: T) => boolean) {
    if (a.length !== b.length) {
        return false;
    }

    const b_ = b.slice();
    for (const x of a) {
        let found = false;

        for (const [idx, y] of b_.entries()) {
            if (compareElementsCb(x, y)) {
                found = true;
                b_.splice(idx, 1);
                break;
            }
        }

        if (!found) {
            return false;
        }
    }

    return true;
}

function areOrderedEqual<T>(a: T[], b: T[], compareElementsCb: (x: T, y: T) => boolean) {
    return a.length === b.length && a.every((x, idx) => compareElementsCb(x, b[idx]));
}

export function areEqualOps(a: Algebra.Operand, b_: Algebra.Operand): boolean {
    if (a.type !== b_.type) {
        return false;
    }

    const hashObj = (x: hash.NotUndefined) => hash(x, { respectType: false });

    // Compare hashes of objects that have to match exactly
    const hashObjOrUndef = (x: hash.NotUndefined | undefined) => (x !== undefined ? hashObj(x) : x);

    // Type narrowing doesn't currently affect the shared generic
    switch (a.type) {
        case Algebra.types.PROJECT: {
            const b = b_ as Algebra.Project;

            const aInScopeVariables = new Set(inScopeVariables(a).map(hashObj));
            const aSelectedInScopeVariables = a.variables.map(hashObj).filter(x => aInScopeVariables.has(x));

            const bInScopeVariables = new Set(inScopeVariables(b).map(hashObj));
            const bSelectedInScopeVariables = b.variables.map(hashObj).filter(x => bInScopeVariables.has(x));

            return (
                // Unbound variables do not affect the query result
                areUnorderedEqual(aSelectedInScopeVariables, bSelectedInScopeVariables, (x, y) => x === y) &&
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
                hashObjOrUndef(a.expression) === hashObjOrUndef(b.expression) &&
                areOrderedEqual(a.input, b.input, areEqualOps)
            );
        }
        case Algebra.types.MINUS: {
            const b = b_ as Algebra.Minus;

            return areOrderedEqual(a.input, b.input, areEqualOps);
        }
        case Algebra.types.BGP: {
            const b = b_ as Algebra.Bgp;

            return areUnorderedEqual(a.patterns, b.patterns, (a, b) => hashObj(a) === hashObj(b));
        }
        case Algebra.types.FILTER: {
            const b = b_ as Algebra.Filter;

            return hashObj(a.expression) === hashObj(b.expression) && areEqualOps(a.input, b.input);
        }
    }
}
