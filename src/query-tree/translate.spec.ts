import { strict as assert } from "node:assert";

import { expect, it, test } from "@jest/globals";

import { expectQueryEquivalence } from "../../tests/utils/index.js";
import { OperandFactory, OperandFactory as F } from "../../tests/utils/operand-factory.js";

import { translate } from "./translate.js";

import { Algebra } from "./index.js";

it("Does not support solution modifiers", () =>
    expect(() =>
        translate(
            `
            PREFIX : <http://example.com/ns#>

            SELECT * WHERE { ?s :p ?o }
            ORDER BY ?s
            `,
        ),
    ).toThrow(new RegExp("^Unsupported SPARQL Algebra element type 'orderby' found")));

test("Everything query", () => {
    const f = new OperandFactory();
    const [A, B, C, D, E] = f.createBgpsAndStrs(5);

    const inputS = `
        PREFIX : <http://example.com/ns#>

        SELECT * WHERE { 
            {
                { { {${A.s}} UNION {${B.s}} } MINUS {${C.s}} }
                { ${D.s} }
            } OPTIONAL { ${E.s} }
            FILTER (?s)
        }`;
    const input = translate(inputS);
    assert(Algebra.isOfType(input, Algebra.types.PROJECT));

    const expected = F.createProject(
        F.createFilter(
            F.createLeftJoin(F.createJoin(F.createMinus(F.createUnion(A.v, B.v), C.v), D.v), E.v),
            f.createExpression("?s"),
        ),
    );

    expectQueryEquivalence(input, expected);
});
