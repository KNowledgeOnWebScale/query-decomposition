import { describe, it, test } from "@jest/globals";

import { moveUnionsToTop } from "../src/lift-operator/union.js";
import type { Algebra } from "../src/query-tree/index.js";

import {
    expectQueryBodyUnmodified,
    expectQueryDecompBodiesEquivalence as expectQueryEquivalence4,
} from "./utils/index.js";
import { OperandFactory as F, type CreateMultiOp } from "./utils/operand-factory.js";

const expectQueryEquivalence3 = (cb: Parameters<typeof expectQueryEquivalence4>[0]) =>
    expectQueryEquivalence4(cb, moveUnionsToTop);

it("Does not modify a query with no union operations", () => {
    expectQueryBodyUnmodified((f, A, B, C) => {
        return {
            input: F.createLeftJoin(F.createJoin(A, B), C),
        };
    }, moveUnionsToTop);
});

// eslint-disable-next-line jest/no-commented-out-tests
// it("Does not support solution modifiers", () =>
//     expect(() => checkUnmodifiedQueryDecomposition(
//         `
//     PREFIX : <http://example.com/ns#>

//     SELECT * WHERE {
//         { ?s :labelA ?label } UNION { ?s :labelB ?label }
//     }
//     ORDER BY ?s`,
//     )).toThrowWithMessage(Error, new RegExp("^Unsupported SPARQL Algebra element type 'orderby' found"))
// )

it("Lifts a union node with 2 operands above a projection", () => {
    expectQueryEquivalence3((f, A, B) => {
        return {
            input: F.createUnion(A, B),
            expectedSubqueries: [A, B],
        };
    });
});

it("Lifts a union with 3 operands above a projection", () => {
    expectQueryEquivalence3((f, A, B, C) => {
        return {
            input: F.createUnion(A, B, C),
            expectedSubqueries: [A, B, C],
        };
    });
});

it("Lifts a union over final projection and filter", () => {
    expectQueryEquivalence3((f, A, B) => {
        const exprA = f.createExpression();
        return {
            input: F.createFilter(F.createUnion(A, B), exprA),
            expectedSubqueries: [F.createFilter(A, exprA), F.createFilter(B, exprA)],
        };
    });
});

describe("Lifts a left-hand side union over final projection and", () => {
    function expectOpDistributesUnion<O extends Algebra.BinaryOrMoreOp>(createOp: CreateMultiOp<O>) {
        expectQueryEquivalence3((f, A, B, C) => {
            return {
                input: createOp(F.createUnion(A, B), C),
                expectedSubqueries: [createOp(A, C), createOp(B, C)],
            };
        });
    }

    test("join", () => expectOpDistributesUnion(F.createJoin));
    test("left join", () => expectOpDistributesUnion(F.createLeftJoin));
    test("minus", () => expectOpDistributesUnion(F.createMinus));
});

describe("Lifts union in RHS over final projection and", () => {
    test("join", () => {
        expectQueryEquivalence3((f, A, B, C) => {
            return {
                input: F.createJoin(A, F.createUnion(B, C)),
                expectedSubqueries: [F.createJoin(A, B), F.createJoin(A, C)],
            };
        });
    });
});

describe("Does not lift a union in RHS over final projection and", () => {
    test("left join", () => {
        expectQueryBodyUnmodified((f, A, B, C) => {
            return {
                input: F.createLeftJoin(A, F.createUnion(B, C)),
            };
        });
    });
    test("minus", () => {
        expectQueryBodyUnmodified((f, A, B, C) => {
            return {
                input: F.createMinus(A, F.createUnion(B, C)),
            };
        });
    });
});

test("Lifts and flattens 2 unions above final projection and join", () => {
    expectQueryEquivalence3((f, A, B, C, D) => {
        return {
            input: F.createJoin(F.createUnion(A, B), F.createUnion(C, D)),
            expectedSubqueries: [
                F.createJoin(A, C),
                F.createJoin(A, D),
                F.createJoin(B, C),
                F.createJoin(B, D),
            ] as const,
        };
    });
});

test("Lift union with 3 operands over final projection and join", () => {
    expectQueryEquivalence3((f, A, B, C, D) => {
        return {
            input: F.createJoin(A, F.createUnion(B, C, D)),
            expectedSubqueries: [F.createJoin(A, B), F.createJoin(A, C), F.createJoin(A, D)],
        };
    });
});

test("Lifts union over final projection and associative operator with 3 operands", () => {
    expectQueryEquivalence3((f, A, B, C, D) => {
        return {
            input: F.createJoin(A, B, F.createUnion(C, D)),
            expectedSubqueries: [F.createJoin(A, B, C), F.createJoin(A, B, D)],
        };
    });
});

it("Flattens joins during decomposition", () => {
    expectQueryEquivalence3((f, A, B, C, D, E) => {
        const input = F.createJoin(F.createUnion(F.createJoin(A, B), F.createJoin(C, D)), E);
        return {
            input,
            expectedSubqueries: [F.createJoin(A, B, E), F.createJoin(C, D, E)],
        };
    });
});

describe("Complex queries with unions that cannot be moved", () => {
    it("Multiple unions indirectly in RHS of minus", () => {
        expectQueryEquivalence3((f, A, B, C, D, E, G, H) => {
            const exprA = f.createExpression();
            return {
                input: F.createJoin(
                    A,
                    F.createMinus(
                        F.createUnion(B, C),
                        F.createJoin(F.createUnion(D, E), F.createFilter(F.createUnion(G, H), exprA)),
                    ),
                ),
                expectedSubqueries: [
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
    it("Immovable union and later in the tree movable union", () => {
        expectQueryEquivalence3((f, A, B, C, D, E) => {
            const exprA = f.createExpression();
            return {
                input: F.createJoin(F.createMinus(A, F.createFilter(F.createUnion(B, C), exprA)), F.createUnion(D, E)),
                expectedSubqueries: [
                    F.createJoin(F.createMinus(A, F.createFilter(F.createUnion(B, C), exprA)), D),
                    F.createJoin(F.createMinus(A, F.createFilter(F.createUnion(B, C), exprA)), E),
                ],
            };
        });
    });
});
