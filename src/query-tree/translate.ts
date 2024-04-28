import { strict as assert } from "assert";

import {
    Algebra as AlgebraExternal,
    toSparql as toSparqlExternal,
    translate as translateExternal,
} from "sparqlalgebrajs";

import { hasLengthAtLeast, type ArrayMinLength } from "../utils.js";

import * as Algebra from "./types.js";
import { UnsupportedAlgebraElement } from "./unsupported-element-error.js";

export function translate(op: string): Algebra.Operand {
    return _translate(translateExternal(op, { quads: false }));
}

export function _translate(op: AlgebraExternal.Operation): Algebra.Operand {
    switch (op.type) {
        case AlgebraExternal.types.PROJECT: {
            return {
                type: Algebra.types.PROJECT,
                input: _translate(op.input),
                variables: op.variables,
            } satisfies Algebra.Project;
        }
        case AlgebraExternal.types.UNION: {
            assert(hasLengthAtLeast(op.input, 2));

            return {
                type: Algebra.types.UNION,
                input: op.input.map(_translate) as ArrayMinLength<Algebra.Operation, 2>,
            } satisfies Algebra.Union;
        }
        case AlgebraExternal.types.MINUS: {
            return {
                type: Algebra.types.MINUS,
                input: [_translate(op.input[0]), _translate(op.input[1])],
            } satisfies Algebra.Minus;
        }
        case AlgebraExternal.types.JOIN: {
            assert(hasLengthAtLeast(op.input, 2));

            return {
                type: Algebra.types.JOIN,
                input: op.input.map(_translate) as ArrayMinLength<Algebra.Operation, 2>,
            } satisfies Algebra.Join;
        }
        case AlgebraExternal.types.LEFT_JOIN: {
            return {
                type: Algebra.types.LEFT_JOIN,
                input: [_translate(op.input[0]), _translate(op.input[1])],
            } satisfies Algebra.LeftJoin;
        }
        case AlgebraExternal.types.FILTER: {
            return {
                type: Algebra.types.FILTER,
                input: _translate(op.input),
                expression: op.expression,
            } satisfies Algebra.Filter;
        }
        case AlgebraExternal.types.BGP: {
            return {
                type: Algebra.types.BGP,
                patterns: op.patterns,
            } satisfies Algebra.Bgp;
        }
        default: {
            throw new UnsupportedAlgebraElement(op);
        }
    }
}

export function toSparql(query: Algebra.Project): string {
    return toSparqlExternal(reverseTranslate(query));
}

export function reverseTranslate(op: Algebra.Operand): AlgebraExternal.Operation {
    switch (op.type) {
        case Algebra.types.PROJECT: {
            return {
                type: AlgebraExternal.types.PROJECT,
                input: reverseTranslate(op.input),
                variables: op.variables as AlgebraExternal.Project["variables"],
            } satisfies AlgebraExternal.Project;
        }
        case Algebra.types.UNION: {
            return {
                type: AlgebraExternal.types.UNION,
                input: op.input.map(reverseTranslate),
            } satisfies AlgebraExternal.Union;
        }
        case Algebra.types.MINUS: {
            return {
                type: AlgebraExternal.types.MINUS,
                input: op.input.map(reverseTranslate),
            } satisfies AlgebraExternal.Minus;
        }
        case Algebra.types.JOIN: {
            return {
                type: AlgebraExternal.types.JOIN,
                input: op.input.map(reverseTranslate),
            } satisfies AlgebraExternal.Join;
        }
        case Algebra.types.LEFT_JOIN: {
            return {
                type: AlgebraExternal.types.LEFT_JOIN,
                input: op.input.map(reverseTranslate),
            } satisfies AlgebraExternal.LeftJoin;
        }
        case Algebra.types.FILTER: {
            return {
                type: AlgebraExternal.types.FILTER,
                input: reverseTranslate(op.input),
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
