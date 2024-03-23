import { strict as assert } from "assert";

import { Algebra as AlgebraExternal, toSparql as toSparqlExternal } from "sparqlalgebrajs";

import { hasLengthAtLeast } from "../utils.js";

import { Algebra } from "./types.js";

export function translate(op: AlgebraExternal.Operation): Algebra.Operation {
    switch (op.type) {
        case AlgebraExternal.types.PROJECT: {
            return {
                type: Algebra.types.PROJECT,
                input: translate(op.input),
                variables: op.variables,
            } satisfies Algebra.Project;
        }
        case AlgebraExternal.types.UNION: {
            assert(hasLengthAtLeast(op.input, 2));

            return {
                type: Algebra.types.UNION,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                input: [
                    translate(op.input.shift()!),
                    op.input.length === 1 ? translate(op.input.shift()!) : translate(op),
                ],
            } satisfies Algebra.Union;
        }
        case AlgebraExternal.types.MINUS: {
            return {
                type: Algebra.types.MINUS,
                input: [translate(op.input[0]), translate(op.input[1])],
            } satisfies Algebra.Minus;
        }
        case AlgebraExternal.types.JOIN: {
            assert(hasLengthAtLeast(op.input, 2));

            return {
                type: Algebra.types.JOIN,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                input: [
                    translate(op.input.shift()!),
                    op.input.length === 1 ? translate(op.input.shift()!) : translate(op),
                ],
            } satisfies Algebra.Join;
        }
        case AlgebraExternal.types.LEFT_JOIN: {
            return {
                type: Algebra.types.LEFT_JOIN,
                input: [translate(op.input[0]), translate(op.input[1])],
            } satisfies Algebra.LeftJoin;
        }
        case AlgebraExternal.types.FILTER: {
            return {
                type: Algebra.types.FILTER,
                input: translate(op.input),
                expression: op.expression,
            } satisfies Algebra.Filter;
        }
        case AlgebraExternal.types.BGP: {
            assert(hasLengthAtLeast(op.patterns, 1));
            return {
                type: Algebra.types.BGP,
                patterns: op.patterns,
            } satisfies Algebra.Bgp;
        }
        default: {
            throw new Error(`Unsupported SPARQL Algebra operation type '${op.type}' found: ${JSON.stringify(op)}`);
        }
    }
}

export function toSparql(query: Algebra.Project): string {
    return toSparqlExternal(reserveTranslate(query));
}

function reserveTranslate(op: Algebra.Operation): AlgebraExternal.Operation {
    switch (op.type) {
        case Algebra.types.PROJECT: {
            return {
                type: AlgebraExternal.types.PROJECT,
                input: reserveTranslate(op.input),
                variables: op.variables as AlgebraExternal.Project["variables"],
            } satisfies AlgebraExternal.Project;
        }
        case Algebra.types.UNION: {
            return {
                type: AlgebraExternal.types.UNION,
                input: flattened_operands(op).map(reserveTranslate),
            } satisfies AlgebraExternal.Union;
        }
        case Algebra.types.MINUS: {
            return {
                type: AlgebraExternal.types.MINUS,
                input: [reserveTranslate(op.input[0]), reserveTranslate(op.input[1])],
            } satisfies AlgebraExternal.Minus;
        }
        case Algebra.types.JOIN: {
            return {
                type: AlgebraExternal.types.JOIN,
                input: flattened_operands(op).map(reserveTranslate),
            } satisfies AlgebraExternal.Join;
        }
        case Algebra.types.LEFT_JOIN: {
            return {
                type: AlgebraExternal.types.LEFT_JOIN,
                input: [reserveTranslate(op.input[0]), reserveTranslate(op.input[1])],
            } satisfies AlgebraExternal.LeftJoin;
        }
        case Algebra.types.FILTER: {
            return {
                type: AlgebraExternal.types.FILTER,
                input: reserveTranslate(op.input),
                expression: op.expression as AlgebraExternal.Filter["expression"],
            } satisfies AlgebraExternal.Filter;
        }
        case Algebra.types.BGP: {
            return {
                type: AlgebraExternal.types.BGP,
                patterns: op.patterns as unknown as AlgebraExternal.Bgp["patterns"],
            } satisfies AlgebraExternal.Bgp;
        }
    }
}

function flattened_operands<T extends Algebra.Operation & Algebra.Double>(op: T): Algebra.Operation[] {
    const operands = new Array<Algebra.Operation>();
    flatten_(op, operands);

    return operands;
}

function flatten_<T extends Algebra.Operation & Algebra.Double>(op: T, operands: Algebra.Operation[]) {
    if (op.input[0].type === Algebra.types.UNION) {
        flatten_(op.input[0], operands);
    } else {
        operands.push(op.input[0]);
    }
    if (op.input[1].type === Algebra.types.UNION) {
        flatten_(op.input[1], operands);
    } else {
        operands.push(op.input[1]);
    }
}
