import { strict as assert } from "assert";

import { describe, test } from "@jest/globals";

import {
    expectQueriesToNotBeEquivalent,
    expectQueriesToBeEquivalent,
    expectQueryToBeUnmodified,
    type QueryProducer,
} from "../../tests/utils.js";

import { types } from "./algebra.js";
import { translate } from "./translate.js";

const cb: QueryProducer = query_s => {
    const query = translate(query_s);
    assert(query.type === types.PROJECT);
    return query;
};

const createQuery = (body: string): string => {
    return `
        PREFIX : <http://example.com/ns#>

        SELECT * WHERE {
            ${body}
        }
    `;
};

function checkCommutative(op: string, expectCb: (a: string, b: string, cb: QueryProducer) => void) {
    expectCb(createQuery(`{ ?s :a :b } ${op} { ?s :x :y }`), createQuery(`{ ?s :x :y } ${op} { ?s :a :b }`), cb);
}

// x * y == y * x
function expectCommutative(op: string) {
    checkCommutative(op, expectQueriesToBeEquivalent);
}

// x * y != y * x
function expectNotCommutative(op: string) {
    checkCommutative(op, expectQueriesToNotBeEquivalent);
}

function checkAssociative(op: string, expectCb: (a: string, b: string, cb: QueryProducer) => void) {
    expectCb(
        createQuery(`{{ ?s :A ?lA } ${op} { ?s :l ?l }} ${op} { ?s :lB ?lB }`),
        createQuery(`{ ?s :lB ?lB } ${op} {{ ?s :A ?lA } ${op} { ?s :l ?l }}`),
        cb,
    );
}

// (x * y) * z == x * (y * z)
function expectAssociative(op: string) {
    checkAssociative(op, expectQueriesToBeEquivalent);
}

// (x * y) * z != x * (y * z)
function expectNotAssociative(op: string) {
    checkAssociative(op, expectQueriesToNotBeEquivalent);
}

const binaryOps: { name: string; op: string; commutative: boolean; associative: boolean }[] = [
    {
        name: "Union",
        op: "UNION",
        commutative: true,
        associative: true,
    },
    {
        name: "Minus",
        op: "MINUS",
        commutative: false,
        associative: false,
    },
    {
        name: "Join",
        op: ".",
        commutative: true,
        associative: true,
    },
    {
        name: "Left Join",
        op: "OPTIONAL",
        commutative: false,
        associative: false,
    },
];

describe.each(binaryOps)("$name", binaryOp => {
    test(`Identical ${binaryOp.name} queries`, () =>
        expectQueryToBeUnmodified(createQuery(`{ ?s :A ?lA } ${binaryOp.op} { ?s :l ?l }`), cb));

    test(`${binaryOp.name} is${!binaryOp.commutative ? " not " : " "}commutative`, () => {
        binaryOp.commutative ? expectCommutative(binaryOp.op) : expectNotCommutative(binaryOp.op);
    });
    test(`${binaryOp.name} is${!binaryOp.associative ? " not " : " "}associative`, () => {
        binaryOp.associative ? expectAssociative(binaryOp.op) : expectNotAssociative(binaryOp.op);
    });
});

test("Different operator types", () => {
    expectQueriesToNotBeEquivalent(
        createQuery(`{ ?s :A ?lA } UNION { ?s :l ?l }`),
        createQuery(`{ ?s :A ?lA } MINUS { ?s :l ?l }`),
        cb,
    );
});

describe("Project", () => {
    test("Identical queries", () => {
        expectQueryToBeUnmodified(createQuery(`?s ?x :y`), cb);
    });
    test("Order of project variables is irrelevant", () => {
        expectQueryToBeUnmodified(`SELECT ?a ?b ?c {}`, cb);
        expectQueriesToBeEquivalent(`SELECT ?a ?b ?c {}`, `SELECT ?c ?a ?b {}`, cb);
    });
});

describe("Filter", () => {
    test("Identical queries", () => {
        expectQueryToBeUnmodified(createQuery(`?s ?x :y FILTER(STRLEN(?s) > 0)`), cb);
    });
    test("Expressions must be exact match", () => {
        expectQueriesToNotBeEquivalent(
            createQuery(`?s ?x :y FILTER(STRLEN(?s) > 0)`),
            createQuery(`?s ?x :y FILTER(STRLEN(?x) > 0)`),
            cb,
        );
    });
});

describe("BGP", () => {
    test("Identical queries", () => {
        expectQueryToBeUnmodified(createQuery(`?s ?x :y . ?s ?z :w`), cb);
    });
    test("Order of triples is irrelevant", () => {
        expectQueriesToBeEquivalent(
            createQuery(`?x :y :z . ?x :w :z . ?y :x :z`),
            createQuery(`?x :w :z . ?y :x :z . ?x :y :z`),
            cb,
        );
    });
});
