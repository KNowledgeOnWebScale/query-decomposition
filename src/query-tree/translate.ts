import { strict as assert } from "assert";

import {
    Algebra as AlgebraExternal,
    toSparql as toSparqlExternal,
    translate as translateExternal,
} from "sparqlalgebrajs";

import { hasLengthAtLeast, type ArrayMinLength } from "../utils.js";

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
import { UnsupportedSPARQLOpError } from "./unsupported-SPARQL-op-error.js";

export function translate(op: string) {
    return _translate(translateExternal(op, { quads: false }));
}

function _translate(op: AlgebraExternal.Operation): Operation {
    switch (op.type) {
        case AlgebraExternal.types.PROJECT: {
            return {
                type: types.PROJECT,
                input: _translate(op.input),
                variables: op.variables,
            } satisfies Project;
        }
        case AlgebraExternal.types.UNION: {
            assert(hasLengthAtLeast(op.input, 2));

            return {
                type: types.UNION,
                input: op.input.map(_translate) as ArrayMinLength<Operation, 2>,
            } satisfies Union;
        }
        case AlgebraExternal.types.MINUS: {
            return {
                type: types.MINUS,
                input: [_translate(op.input[0]), _translate(op.input[1])],
            } satisfies Minus;
        }
        case AlgebraExternal.types.JOIN: {
            assert(hasLengthAtLeast(op.input, 2));

            return {
                type: types.JOIN,
                input: op.input.map(_translate) as ArrayMinLength<Operation, 2>,
            } satisfies Join;
        }
        case AlgebraExternal.types.LEFT_JOIN: {
            return {
                type: types.LEFT_JOIN,
                input: [_translate(op.input[0]), _translate(op.input[1])],
            } satisfies LeftJoin;
        }
        case AlgebraExternal.types.FILTER: {
            return {
                type: types.FILTER,
                input: _translate(op.input),
                expression: op.expression,
            } satisfies Filter;
        }
        case AlgebraExternal.types.BGP: {
            return {
                type: types.BGP,
                patterns: op.patterns,
            } satisfies Bgp;
        }
        default: {
            throw new UnsupportedSPARQLOpError(op);
        }
    }
}

export function toSparql(query: Project): string {
    return toSparqlExternal(reserveTranslate(query));
}

function reserveTranslate(op: Operation): AlgebraExternal.Operation {
    switch (op.type) {
        case types.PROJECT: {
            return {
                type: AlgebraExternal.types.PROJECT,
                input: reserveTranslate(op.input),
                variables: op.variables as AlgebraExternal.Project["variables"],
            } satisfies AlgebraExternal.Project;
        }
        case types.UNION: {
            return {
                type: AlgebraExternal.types.UNION,
                input: op.input.map(reserveTranslate),
            } satisfies AlgebraExternal.Union;
        }
        case types.MINUS: {
            return {
                type: AlgebraExternal.types.MINUS,
                input: [reserveTranslate(op.input[0]), reserveTranslate(op.input[1])],
            } satisfies AlgebraExternal.Minus;
        }
        case types.JOIN: {
            return {
                type: AlgebraExternal.types.JOIN,
                input: op.input.map(reserveTranslate),
            } satisfies AlgebraExternal.Join;
        }
        case types.LEFT_JOIN: {
            return {
                type: AlgebraExternal.types.LEFT_JOIN,
                input: [reserveTranslate(op.input[0]), reserveTranslate(op.input[1])],
            } satisfies AlgebraExternal.LeftJoin;
        }
        case types.FILTER: {
            return {
                type: AlgebraExternal.types.FILTER,
                input: reserveTranslate(op.input),
                expression: op.expression as AlgebraExternal.Filter["expression"],
            } satisfies AlgebraExternal.Filter;
        }
        case types.BGP: {
            return {
                type: AlgebraExternal.types.BGP,
                patterns: op.patterns as unknown as AlgebraExternal.Bgp["patterns"],
            } satisfies AlgebraExternal.Bgp;
        }
    }
}
