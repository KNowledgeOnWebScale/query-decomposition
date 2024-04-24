import { areOrderedEqual, areUnorderedEqual, hashObject, hashObjectOrUndefined } from "../utils.js";

import { types, type Operand, type OperandTypeMapping } from "./algebra.js";

const EQUIVALENCE_CBS: { [K in Operand["type"]]: (a: OperandTypeMapping[K], b: OperandTypeMapping[K]) => boolean } = {
    [types.PROJECT]: (a, b) => {
        return hashObject(a.variables) === hashObject(b.variables) && areEquivalent(a.input, b.input);
    },
    [types.UNION]: (a, b) => {
        return areUnorderedEqual(a.input, b.input, areEquivalent);
    },
    [types.MINUS]: (a, b) => {
        return areOrderedEqual(a.input, b.input, areEquivalent);
    },
    [types.JOIN]: (a, b) => {
        return areUnorderedEqual(a.input, b.input, areEquivalent);
    },
    [types.LEFT_JOIN]: (a, b) => {
        return (
            hashObjectOrUndefined(a.expression) === hashObjectOrUndefined(b.expression) &&
            areOrderedEqual(a.input, b.input, areEquivalent)
        );
    },
    [types.FILTER]: (a, b) => {
        return hashObject(a.expression) === hashObject(b.expression) && areEquivalent(a.input, b.input);
    },
    [types.BGP]: (a, b) => {
        return hashObject(a) === hashObject(b);
    },
};

export function areEquivalent(a: Operand, b: Operand): boolean {
    if (a.type !== b.type) {
        return false;
    }

    // Control flow does not narrow discriminated union types to be the same yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    return EQUIVALENCE_CBS[a.type](a as any, b as any);
}
