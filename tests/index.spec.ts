import { describe, it, test } from "@jest/globals";

import { moveUnionsToTop } from "../src/lift-operator/union.js";

import { expectQueryBodyUnmodified, expectQueryDecompBodiesEquivalence } from "./utils/index.js";
import { OperandFactory as F, type CreateMultiOp } from "./utils/operand-factory.js";

import type { Algebra } from "../src/query-tree/index.js";

it("Does not modify a query with no union operations", () => {
    expectQueryBodyUnmodified((f, A, B, C) => {
        return {
            input: F.createLeftJoin(F.createJoin(A, B), C),
        };
    }, moveUnionsToTop);
});

it("Lifts a union node with 2 operands above a projection", () => {
    expectQueryDecompBodiesEquivalence((f, A, B) => {
        return {
            input: F.createUnion(A, B),
            expectedSubqueries: [A, B],
        };
    });
});

it("Lifts a union with 3 operands above a projection", () => {
    expectQueryDecompBodiesEquivalence((f, A, B, C) => {
        return {
            input: F.createUnion(A, B, C),
            expectedSubqueries: [A, B, C],
        };
    });
});

it("Lifts a union over final projection and filter", () => {
    expectQueryDecompBodiesEquivalence((f, A, B) => {
        const exprA = f.createExpression();
        return {
            input: F.createFilter(F.createUnion(A, B), exprA),
            expectedSubqueries: [F.createFilter(A, exprA), F.createFilter(B, exprA)],
        };
    });
});

describe("Lifts a left-hand side union over final projection and", () => {
    function expectOpDistributesUnion<O extends Algebra.BinaryOrMoreOp>(createOp: CreateMultiOp<O>) {
        expectQueryDecompBodiesEquivalence((f, A, B, C) => {
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
        expectQueryDecompBodiesEquivalence((f, A, B, C) => {
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
    expectQueryDecompBodiesEquivalence((f, A, B, C, D) => {
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
    expectQueryDecompBodiesEquivalence((f, A, B, C, D) => {
        return {
            input: F.createJoin(A, F.createUnion(B, C, D)),
            expectedSubqueries: [F.createJoin(A, B), F.createJoin(A, C), F.createJoin(A, D)],
        };
    });
});

test("Lifts union over final projection and associative operator with 3 operands", () => {
    expectQueryDecompBodiesEquivalence((f, A, B, C, D) => {
        return {
            input: F.createJoin(A, B, F.createUnion(C, D)),
            expectedSubqueries: [F.createJoin(A, B, C), F.createJoin(A, B, D)],
        };
    });
});

it("Flattens joins during decomposition", () => {
    expectQueryDecompBodiesEquivalence((f, A, B, C, D, E) => {
        const input = F.createJoin(F.createUnion(F.createJoin(A, B), F.createJoin(C, D)), E);
        return {
            input,
            expectedSubqueries: [F.createJoin(A, B, E), F.createJoin(C, D, E)],
        };
    });
});

test("Only immovable union", () => {
    expectQueryBodyUnmodified((f, A, B, C) => {
        return {
            input: F.createMinus(A, F.createUnion(B, C)),
        };
    }, moveUnionsToTop);
});

describe("Complex queries with unions that cannot be moved", () => {
    it("Multiple unions indirectly in RHS of minus", () => {
        expectQueryDecompBodiesEquivalence((f, A, B, C, D, E, G, H) => {
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
    it("Immovable union followed by movable union", () => {
        expectQueryDecompBodiesEquivalence((f, A, B, C, D, E) => {
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

    it("Immovable union followed by movable union followed by immovable union followed by movable union", () => {
        expectQueryDecompBodiesEquivalence((f, A, B, C, D, E, G, H, I, J) => {
            const u1 = F.createUnion(B, C);
            const u3 = F.createUnion(G, H);

            const g = F.createMinus(A, u1);
            return {
                input: F.createJoin(F.createMinus(F.createJoin(g, F.createUnion(D, E)), u3), F.createUnion(I, J)),
                expectedSubqueries: [
                    F.createJoin(F.createMinus(F.createJoin(g, D), u3), I),
                    F.createJoin(F.createMinus(F.createJoin(g, D), u3), J),
                    F.createJoin(F.createMinus(F.createJoin(g, E), u3), I),
                    F.createJoin(F.createMinus(F.createJoin(g, E), u3), J),
                ],
            };
        });
    });
});
