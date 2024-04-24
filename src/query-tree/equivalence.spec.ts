import { describe, test } from "@jest/globals";

import {
    type QueryTransformer,
    expectQueryBodyUnmodified,
    expectQueryBodyEquivalence,
    expectNotQueryBodyEquivalence,
    expectQueryEquivalence,
    expectQueryUnmodified,
    expectNotQueryEquivalence,
} from "../../tests/utils/index.js";
import { OperandFactory as F, type CreateMultiOp } from "../../tests/utils/operand-factory.js";

import { toSparql, translate } from "./translate.js";

import { Algebra } from "./index.js";

type createMultiOp = (...operands: Algebra.BinaryOp["input"]) => Algebra.BinaryOrMoreOp;

function checkCommutative(
    createOp: createMultiOp,
    expectCb: (
        cb: (f: F, ...bgps: Algebra.Bgp[]) => { input: Algebra.Operand; expected: Algebra.Operand },
        qt?: QueryTransformer,
    ) => void,
) {
    expectCb((f, A, B) => {
        return {
            input: createOp(A, B),
            expected: createOp(B, A),
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

function checkAssociative(createOp: createMultiOp, expectCb: (a: Algebra.Project, b: Algebra.Project) => void) {
    const f = new F();
    const [A, B, C] = f.createBgps(3);

    // Associativity is encoded into the tree on construction
    const input = translate(toSparql(F.createProject(createOp(createOp(A, B), C)))) as Algebra.Project;
    const expected = translate(toSparql(F.createProject(createOp(A, createOp(B, C))))) as Algebra.Project;

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
    [K in Algebra.BinaryOrMoreOp["type"]]: {
        name: string;
        createOp: CreateMultiOp<Algebra.OperandTypeMapping[K]>;
        commutative: boolean;
        associative: boolean;
    };
} = {
    [Algebra.types.UNION]: {
        name: "Union",
        createOp: F.createUnion,
        commutative: true,
        associative: true,
    },
    [Algebra.types.MINUS]: {
        name: "Minus",
        createOp: F.createMinus,
        commutative: false,
        associative: false,
    },
    [Algebra.types.JOIN]: {
        name: "Join",
        createOp: F.createJoin,
        commutative: true,
        associative: true,
    },
    [Algebra.types.LEFT_JOIN]: {
        name: "Left Join",
        createOp: F.createLeftJoin,
        commutative: false,
        associative: false,
    },
};

describe.each(Object.values(binaryOps))("$name", binaryOp => {
    test(`Identical ${binaryOp.name} queries`, () =>
        expectQueryBodyUnmodified((f, A, B) => {
            return {
                input: binaryOp.createOp(A, B),
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
            input: F.createUnion(A, B),
            expected: F.createJoin(A, B),
        };
    });
});

describe("Project", () => {
    test("Identical queries", () => {
        const f = new F();
        const A = f.createBgp();
        expectQueryUnmodified(F.createProject(A, [f.factory.createTerm("?x"), f.factory.createTerm("?y")]));
    });
    test("Order of project variables is irrelevant", () => {
        const f = new F();
        const A = f.createBgp();
        expectQueryEquivalence(
            F.createProject(A, [f.factory.createTerm("?x"), f.factory.createTerm("?y")]),
            F.createProject(A, [f.factory.createTerm("?y"), f.factory.createTerm("?x")]),
        );
    });
});

describe("Filter", () => {
    test("Identical queries", () => {
        expectQueryBodyUnmodified((f, A) => {
            return {
                input: F.createFilter(A, f.createExpression("?x")),
            };
        });
    });
    test("Expressions must be exact match", () => {
        expectNotQueryBodyEquivalence((f, A) => {
            return {
                input: F.createFilter(A, f.createExpression("?x")),
                expected: F.createFilter(A, f.createExpression("?y")),
            };
        });
    });
});

describe("BGP", () => {
    test("Identical queries", () => {
        expectQueryBodyUnmodified(f => {
            return {
                input: f.createBgp(2),
            };
        });
    });
    test("Order of triples is irrelevant", () => {
        expectQueryBodyEquivalence(f => {
            const t = f.createBgp(2);
            const t2 = { ...structuredClone(t), patterns: [t.patterns[1]!, t.patterns[0]!] };
            return {
                input: t,
                expected: t2,
            };
        });
    });
});

test("Different number of operands join", () => {
    expectNotQueryBodyEquivalence((f, A, B, C) => {
        return {
            input: F.createJoin(A, B, C),
            expected: F.createJoin(A, B),
        };
    });
});

// Need at least 3 operands for count-sensitivity, since we need to reduce the number of operands by at least one
// and 2 is the smallest number of operands that any operator takes who also takes 3 (n + 1) operands

// Technically Union(A, A, B) = Union(A, B) = Union(A, B, B)
// However since we never create rewrites like this, we don't take this into account
describe("Operand comparison is count-sensitive for ternary or more operators", () => {
    const ternaryOrMoreOps: {
        [K in Algebra.TernaryOrMoreOp["type"]]: {
            name: string;
            createOp: CreateMultiOp<Algebra.OperandTypeMapping[K]>;
        };
    } = {
        [Algebra.types.JOIN]: {
            name: "Join",
            createOp: F.createJoin,
        },
        [Algebra.types.UNION]: {
            name: "Union",
            createOp: F.createUnion,
        },
    };

    test.each(Object.values(ternaryOrMoreOps))("$name", ternaryOrMoreOp => {
        expectNotQueryBodyEquivalence((f, A, B) => {
            return {
                input: ternaryOrMoreOp.createOp(A, A, B),
                expected: ternaryOrMoreOp.createOp(A, B, B),
            };
        });
    });
});
