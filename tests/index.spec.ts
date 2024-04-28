import { strict as assert } from "node:assert";

import { describe, expect, it, test } from "@jest/globals";

import { maximallyDecomposeQuery } from "@src/index.js";
import { QueryTree } from "@src/query-tree/index.js";
import { translate } from "@src/query-tree/translate.js";

import { OperandFactory as F, OperandFactory, type CreateMultiOp } from "./utils/operand-factory.js";
import { expectQueryDecompBodiesEquivalence } from "./utils/query-tree/expect-body.js";
import { expectQueryEquivalence } from "./utils/query-tree/expect.js";

it("Does not modify a query with no union operations", () => {
    expectQueryDecompBodiesEquivalence((f, A, B, C) => {
        const inputQueryBody = F.createLeftJoin(F.createJoin(A, B), C);
        return {
            inputQueryBody,
            expectedSubqueryBodies: [inputQueryBody],
        };
    });
});

it("Does not modify a query string with no union operations", () => {
    const f = new OperandFactory();
    const [A, B, C] = f.createBgpsAndStrs(5);

    const inputS = `
        PREFIX : <http://example.com/ns#>

        SELECT * WHERE { 
            { {${A.s}} OPTIONAL {${B.s}} } . {${C.s}}
        }`;
    const foundSubqueryStrings = maximallyDecomposeQuery(inputS);
    expect(foundSubqueryStrings).toHaveLength(1);
    const foundSubQuery = translate(foundSubqueryStrings[0]);
    assert(foundSubQuery.type === QueryTree.types.PROJECT);

    const input = translate(inputS);
    assert(input.type === QueryTree.types.PROJECT);

    expectQueryEquivalence(foundSubQuery, input);
});

it("Lifts a union node with 2 operands above a projection", () => {
    expectQueryDecompBodiesEquivalence((f, A, B) => {
        return {
            inputQueryBody: F.createUnion(A, B),
            expectedSubqueryBodies: [A, B],
        };
    });
});

it("Lifts a union with 3 operands above a projection", () => {
    expectQueryDecompBodiesEquivalence((f, A, B, C) => {
        return {
            inputQueryBody: F.createUnion(A, B, C),
            expectedSubqueryBodies: [A, B, C],
        };
    });
});

it("Lifts a union over final projection and filter", () => {
    expectQueryDecompBodiesEquivalence((f, A, B) => {
        const exprA = f.createExpression();
        return {
            inputQueryBody: F.createFilter(F.createUnion(A, B), exprA),
            expectedSubqueryBodies: [F.createFilter(A, exprA), F.createFilter(B, exprA)],
        };
    });
});

describe("Lifts a left-hand side union over final projection and", () => {
    function expectOpDistributesUnion<O extends QueryTree.BinaryOrMoreOp>(createOp: CreateMultiOp<O>) {
        expectQueryDecompBodiesEquivalence((f, A, B, C) => {
            return {
                inputQueryBody: createOp(F.createUnion(A, B), C),
                expectedSubqueryBodies: [createOp(A, C), createOp(B, C)],
            };
        });
    }

    test("join", () => expectOpDistributesUnion(F.createJoin));
    test("left join", () => expectOpDistributesUnion(F.createLeftJoin));
    test("minus", () => expectOpDistributesUnion(F.createMinus));
});

describe("Lifts union in RHS over final projection and", () => {
    test("join", () => {
        expectQueryDecompBodiesEquivalence((f, A, B, C) => {
            return {
                inputQueryBody: F.createJoin(A, F.createUnion(B, C)),
                expectedSubqueryBodies: [F.createJoin(A, B), F.createJoin(A, C)],
            };
        });
    });
});

describe("Does not lift a union in RHS over final projection and", () => {
    test("left join", () => {
        expectQueryDecompBodiesEquivalence((f, A, B, C) => {
            const inputQueryBody = F.createLeftJoin(A, F.createUnion(B, C));
            return {
                inputQueryBody,
                expectedSubqueryBodies: [inputQueryBody],
            };
        });
    });
    test("minus", () => {
        expectQueryDecompBodiesEquivalence((f, A, B, C) => {
            const inputQueryBody = F.createMinus(A, F.createUnion(B, C));
            return {
                inputQueryBody,
                expectedSubqueryBodies: [inputQueryBody],
            };
        });
    });
});

test("Lifts and flattens 2 unions above final projection and join", () => {
    expectQueryDecompBodiesEquivalence((f, A, B, C, D) => {
        return {
            inputQueryBody: F.createJoin(F.createUnion(A, B), F.createUnion(C, D)),
            expectedSubqueryBodies: [
                F.createJoin(A, C),
                F.createJoin(A, D),
                F.createJoin(B, C),
                F.createJoin(B, D),
            ] as const,
        };
    });
});

test("Lift union with 3 operands over final projection and join", () => {
    expectQueryDecompBodiesEquivalence((f, A, B, C, D) => {
        return {
            inputQueryBody: F.createJoin(A, F.createUnion(B, C, D)),
            expectedSubqueryBodies: [F.createJoin(A, B), F.createJoin(A, C), F.createJoin(A, D)],
        };
    });
});

test("Lifts union over final projection and associative operator with 3 operands", () => {
    expectQueryDecompBodiesEquivalence((f, A, B, C, D) => {
        return {
            inputQueryBody: F.createJoin(A, B, F.createUnion(C, D)),
            expectedSubqueryBodies: [F.createJoin(A, B, C), F.createJoin(A, B, D)],
        };
    });
});

it("Flattens joins during decomposition", () => {
    expectQueryDecompBodiesEquivalence((f, A, B, C, D, E) => {
        const input = F.createJoin(F.createUnion(F.createJoin(A, B), F.createJoin(C, D)), E);
        return {
            inputQueryBody: input,
            expectedSubqueryBodies: [F.createJoin(A, B, E), F.createJoin(C, D, E)],
        };
    });
});

test("Only immovable union", () => {
    expectQueryDecompBodiesEquivalence((f, A, B, C) => {
        const inputQueryBody = F.createMinus(A, F.createUnion(B, C));
        return {
            inputQueryBody,
            expectedSubqueryBodies: [inputQueryBody],
        };
    });
});

describe("Complex queries with unions that cannot be moved", () => {
    it("Multiple unions indirectly in RHS of minus", () => {
        expectQueryDecompBodiesEquivalence((f, A, B, C, D, E, G, H) => {
            const exprA = f.createExpression();
            return {
                inputQueryBody: F.createJoin(
                    A,
                    F.createMinus(
                        F.createUnion(B, C),
                        F.createJoin(F.createUnion(D, E), F.createFilter(F.createUnion(G, H), exprA)),
                    ),
                ),
                expectedSubqueryBodies: [
                    F.createJoin(
                        A,
                        F.createMinus(B, F.createJoin(F.createUnion(D, E), F.createFilter(F.createUnion(G, H), exprA))),
                    ),
                    F.createJoin(
                        A,
                        F.createMinus(C, F.createJoin(F.createUnion(D, E), F.createFilter(F.createUnion(G, H), exprA))),
                    ),
                ],
            };
        });
    });
    it("Immovable union followed by movable union", () => {
        expectQueryDecompBodiesEquivalence((f, A, B, C, D, E) => {
            const exprA = f.createExpression();
            return {
                inputQueryBody: F.createJoin(
                    F.createMinus(A, F.createFilter(F.createUnion(B, C), exprA)),
                    F.createUnion(D, E),
                ),
                expectedSubqueryBodies: [
                    F.createJoin(F.createMinus(A, F.createFilter(F.createUnion(B, C), exprA)), D),
                    F.createJoin(F.createMinus(A, F.createFilter(F.createUnion(B, C), exprA)), E),
                ],
            };
        });
    });

    it("Immovable union followed by movable union followed by immovable union followed by movable union", () => {
        expectQueryDecompBodiesEquivalence((f, A, B, C, D, E, G, H, I, J) => {
            const u1 = F.createUnion(B, C);
            const u3 = F.createUnion(G, H);

            const g = F.createMinus(A, u1);
            return {
                inputQueryBody: F.createJoin(
                    F.createMinus(F.createJoin(g, F.createUnion(D, E)), u3),
                    F.createUnion(I, J),
                ),
                expectedSubqueryBodies: [
                    F.createJoin(F.createMinus(F.createJoin(g, D), u3), I),
                    F.createJoin(F.createMinus(F.createJoin(g, D), u3), J),
                    F.createJoin(F.createMinus(F.createJoin(g, E), u3), I),
                    F.createJoin(F.createMinus(F.createJoin(g, E), u3), J),
                ],
            };
        });
    });
});
