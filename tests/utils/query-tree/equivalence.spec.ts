import { strict as assert } from "node:assert";

import { describe, test } from "@jest/globals";

import { QueryTree } from "../../../src/query-tree/index.js";
import { OperandFactory as F, type CreateMultiOp } from "../operand-factory.js";

import { expectNotQueryBodyEquivalence, expectQueryBodyEquivalence, type QueryTransformer } from "./expect-body.js";
import { expectNotQueryEquivalence, expectQueryEquivalence } from "./expect.js";

type createMultiOp = (...operands: QueryTree.BinaryOp["input"]) => QueryTree.BinaryOrMoreOp;

function checkCommutative(
    createOp: createMultiOp,
    expectCb: (
        cb: (
            f: F,
            ...bgps: QueryTree.Bgp[]
        ) => { inputQueryBody: QueryTree.Operand; expectedQueryBody: QueryTree.Operand },
        qt?: QueryTransformer,
    ) => void,
) {
    expectCb((f, A, B) => {
        return {
            inputQueryBody: createOp(A, B),
            expectedQueryBody: createOp(B, A),
        };
    });
}

//
/**
 * `x * y == y * x`
 */
function expectCommutative(createOp: createMultiOp) {
    checkCommutative(createOp, expectQueryBodyEquivalence);
}

//
/**
 * `x * y != y * x`
 */
function expectNotCommutative(createOp: createMultiOp) {
    checkCommutative(createOp, expectNotQueryBodyEquivalence);
}

function checkAssociative(createOp: createMultiOp, expectCb: (a: QueryTree.Project, b: QueryTree.Project) => void) {
    const f = new F();
    const [A, B, C] = f.createBgps(3);

    // Associativity is encoded into the tree on construction
    const input = QueryTree.translate(QueryTree.toSparql(F.createProject(createOp(createOp(A, B), C))));
    assert(input.type === QueryTree.types.PROJECT);
    const expected = QueryTree.translate(QueryTree.toSparql(F.createProject(createOp(A, createOp(B, C)))));
    assert(expected.type === QueryTree.types.PROJECT);

    expectCb(input, expected);
}
/**
 * `(x * y) * z == x * (y * z)`
 */
function expectAssociative(createOp: createMultiOp) {
    checkAssociative(createOp, expectQueryEquivalence);
}

/**
 * `(x * y) * z != x * (y * z)`
 */
function expectNotAssociative(createOp: createMultiOp) {
    checkAssociative(createOp, expectNotQueryEquivalence);
}

const binaryOps: {
    [K in QueryTree.BinaryOrMoreOp["type"]]: {
        name: string;
        createOp: CreateMultiOp<QueryTree.OperandTypeMapping[K]>;
        commutative: boolean;
        associative: boolean;
    };
} = {
    [QueryTree.types.UNION]: {
        name: "Union",
        createOp: F.createUnion,
        commutative: true,
        associative: true,
    },
    [QueryTree.types.MINUS]: {
        name: "Minus",
        createOp: F.createMinus,
        commutative: false,
        associative: false,
    },
    [QueryTree.types.JOIN]: {
        name: "Join",
        createOp: F.createJoin,
        commutative: true,
        associative: true,
    },
    [QueryTree.types.LEFT_JOIN]: {
        name: "Left Join",
        createOp: F.createLeftJoin,
        commutative: false,
        associative: false,
    },
};

describe.each(Object.values(binaryOps))("$name", binaryOp => {
    test(`Identical ${binaryOp.name} queries`, () =>
        expectQueryBodyEquivalence((f, A, B) => {
            const inputQueryBody = binaryOp.createOp(A, B);
            return {
                inputQueryBody,
                expectedQueryBody: inputQueryBody,
            };
        }));

    test(`${binaryOp.name} is${!binaryOp.commutative ? " not " : " "}commutative`, () => {
        binaryOp.commutative ? expectCommutative(binaryOp.createOp) : expectNotCommutative(binaryOp.createOp);
    });

    test(`${binaryOp.name} is${!binaryOp.associative ? " not " : " "}associative`, () => {
        binaryOp.associative ? expectAssociative(binaryOp.createOp) : expectNotAssociative(binaryOp.createOp);
    });
});

test("Different operator types", () => {
    expectNotQueryBodyEquivalence((f, A, B) => {
        return {
            inputQueryBody: F.createUnion(A, B),
            expectedQueryBody: F.createJoin(A, B),
        };
    });
});

describe("Project", () => {
    test("Identical queries", () => {
        const f = new F();
        const A = f.createBgp();
        const inputQuery = F.createProject(A, [f.factory.createTerm("?x"), f.factory.createTerm("?y")]);
        expectQueryEquivalence(inputQuery, inputQuery);
    });
});

describe("Filter", () => {
    test("Identical queries", () => {
        expectQueryBodyEquivalence((f, A) => {
            const inputQueryBody = F.createFilter(A, f.createExpression("?x"));
            return {
                inputQueryBody,
                expectedQueryBody: inputQueryBody,
            };
        });
    });
    test("Expressions must be identical", () => {
        expectNotQueryBodyEquivalence((f, A) => {
            return {
                inputQueryBody: F.createFilter(A, f.createExpression("?x")),
                expectedQueryBody: F.createFilter(A, f.createExpression("?y")),
            };
        });
    });
});

describe("BGP", () => {
    test("Identical queries", () => {
        expectQueryBodyEquivalence(f => {
            const inputQueryBody = f.createBgp(2);
            return {
                inputQueryBody,
                expectedQueryBody: inputQueryBody,
            };
        });
    });
});

test("Different number of operands join", () => {
    expectNotQueryBodyEquivalence((f, A, B, C) => {
        return {
            inputQueryBody: F.createJoin(A, B, C),
            expectedQueryBody: F.createJoin(A, B),
        };
    });
});

// Need at least 3 operands for count-sensitivity, since we need to reduce the number of operands by at least one
// and 2 is the smallest number of operands that any operator takes who also takes 3 (n + 1) operands

// Technically Union(A, A, B) = Union(A, B) = Union(A, B, B)
// However since we never create rewrites like this, we don't take this into account
describe("Operand comparison is count-sensitive for ternary or more operators", () => {
    const ternaryOrMoreOps: {
        [K in QueryTree.TernaryOrMoreOp["type"]]: {
            name: string;
            createOp: CreateMultiOp<QueryTree.OperandTypeMapping[K]>;
        };
    } = {
        [QueryTree.types.JOIN]: {
            name: "Join",
            createOp: F.createJoin,
        },
        [QueryTree.types.UNION]: {
            name: "Union",
            createOp: F.createUnion,
        },
    };

    test.each(Object.values(ternaryOrMoreOps))("$name", ternaryOrMoreOp => {
        expectNotQueryBodyEquivalence((f, A, B) => {
            return {
                inputQueryBody: ternaryOrMoreOp.createOp(A, A, B),
                expectedQueryBody: ternaryOrMoreOp.createOp(A, B, B),
            };
        });
    });
});
