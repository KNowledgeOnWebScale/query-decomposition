import { strict as assert } from "node:assert";

import { describe, expect, it, test } from "@jest/globals";

import { OperandFactory, OperandFactory as F } from "@tests/utils/operand-factory.js";
import { expectQueryEquivalence } from "@tests/utils/query-tree/expect.js";

import { QueryTree } from "./index.js";

it("Does not support solution modifiers", () =>
    expect(() =>
        QueryTree.translate(
            `
            PREFIX : <http://example.com/ns#>

            SELECT * WHERE { ?s :p ?o }
            ORDER BY ?s
            `,
        ),
    ).toThrow(new RegExp("^Unsupported SPARQL Algebra element type 'orderby' found")));

describe("Everything query", () => {
    const f = new OperandFactory();
    const [A, B, C, D, E] = f.createBgpsAndStrs(5);

    const inputS = `
        PREFIX : <http://example.com/ns#>

        SELECT * WHERE { 
            {
                { { {${A.s}} UNION {${B.s}} } MINUS {${C.s}} }
                { ${D.s} }
            } OPTIONAL { ${E.s} FILTER(?s) }
            FILTER (?s)
        }`;
    const input = QueryTree.translate(inputS);
    assert(input.type === QueryTree.types.PROJECT);

    const expected = F.createProject(
        F.createFilter(
            F.createLeftJoin(
                F.createJoin(F.createMinus(F.createUnion(A.v, B.v), C.v), D.v),
                E.v,
                f.createExpression("?s"),
            ),
            f.createExpression("?s"),
        ),
    );

    test("Forward translation", () => {
        expectQueryEquivalence(input, expected);
    });

    test("Forward followed by round-trip translation", () => {
        const found = QueryTree.translate(QueryTree.toSparql(input));
        assert(found.type === QueryTree.types.PROJECT);
        expectQueryEquivalence(found, expected);
    });
});
