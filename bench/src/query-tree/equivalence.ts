import { strict as assert } from "node:assert";

import { hashObject, hashObjectOrUndefined } from "move-sparql-unions-to-top/src/utils.js";
import { areOrderedEqual, areUnorderedEqual } from "move-sparql-unions-to-top/tests/utils/index.js"
import { Util as AlgebraUtil, Algebra } from "sparqlalgebrajs";

export function areEquivalent(a: Algebra.Operation, b: Algebra.Operation): boolean {
    if (a.type !== b.type) {
        return false;
    }

    const equiv_cb = EQUIVALENCE_CBS[a.type];
    assert(equiv_cb !== undefined, `Unsupported Operation type: ${a.type}`)

    // Control flow does not narrow discriminated union types to be the same yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    return equiv_cb(a as any, b as any);
}

type EquivalenceCb<T extends Algebra.Operation> = (a: T, b: T) => boolean
const EQUIVALENCE_CBS: {[K in Algebra.types]?: EquivalenceCb<Extract<Algebra.Operation, { type: K }>>} = {
    [Algebra.types.PROJECT]: (a, b) => {
        const aInScopeVariables = new Set(AlgebraUtil.inScopeVariables(a.input).map(hashObject));
        const aSelectedInScopeVariables = a.variables.map(hashObject).filter(x => aInScopeVariables.has(x));

        const bInScopeVariables = new Set(AlgebraUtil.inScopeVariables(b.input).map(hashObject));
        const bSelectedInScopeVariables = b.variables.map(hashObject).filter(x => bInScopeVariables.has(x));

        return (
            // Unbound variables do not affect equivalence
            areUnorderedEqual(aSelectedInScopeVariables, bSelectedInScopeVariables, (x, y) => x === y) &&
                areEquivalent(a.input, b.input)
        );    
    },
    [Algebra.types.UNION]: (a, b) => {
        return areUnorderedEqual(a.input, b.input, areEquivalent);
    },
    [Algebra.types.MINUS]: (a, b) => {
        return areOrderedEqual(a.input, b.input, areEquivalent);
    },
    [Algebra.types.JOIN]: (a, b) => {
        return areUnorderedEqual(a.input, b.input, areEquivalent);
    },
    [Algebra.types.LEFT_JOIN]: (a, b) => {
        return (
            hashObjectOrUndefined(a.expression) === hashObjectOrUndefined(b.expression) &&
            areOrderedEqual(a.input, b.input, areEquivalent)
        );
    },
    [Algebra.types.FILTER]: (a, b) => {
        return hashObject(a.expression) === hashObject(b.expression) && areEquivalent(a.input, b.input);
    },
    [Algebra.types.BGP]: (a, b) => {
        return areUnorderedEqual(a.patterns, b.patterns, (a, b) => hashObject(a) === hashObject(b));
    },
};
