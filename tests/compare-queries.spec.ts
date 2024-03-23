import { describe, it, test } from "@jest/globals";
import { Algebra, translate } from "sparqlalgebrajs";
import { expectNotQueryEquivalence, expectQueryEquivalence, expectEquivalentQuery, type QueryProducer } from "./utils.js";
import { strict as assert } from "assert";

const cb: QueryProducer = (query_s) => {
    const query = translate(query_s);
    assert(query.type == Algebra.types.PROJECT);
    return query;
}

const createQuery = (body: string): string => {
    return `
        PREFIX : <http://example.com/ns#>

        SELECT * WHERE {
            ${body}
        }
    `
}

function checkCommutative(op: string, expectCb: (a: string, b: string, cb: QueryProducer) => void) {
    expectCb(createQuery(`{ ?s :a :b } ${op} { ?s :x :y }`), createQuery(`{ ?s :x :y } ${op} { ?s :a :b }`),cb)
}

// x * y == y * x
function expectCommutative(op: string) {
    checkCommutative(op, expectQueryEquivalence);
}

// x * y != y * x
function expectNotCommutative(op: string) {
    checkCommutative(op, expectNotQueryEquivalence);
}

function checkAssociative(op: string, expectCb: (a: string, b: string, cb: QueryProducer) => void) {
    expectCb(createQuery(`{{ ?s :A ?lA } ${op} { ?s :l ?l }} ${op} { ?s :lB ?lB }`), createQuery(`{ ?s :lB ?lB } ${op} {{ ?s :A ?lA } ${op} { ?s :l ?l }}`), cb)
}

// (x * y) * z == x * (y * z)
function expectAssociative(op: string) {
    checkAssociative(op, expectQueryEquivalence);
}

// (x * y) * z != x * (y * z)
function expectNotAssociative(op: string) {
    checkAssociative(op, expectNotQueryEquivalence);
}

// TODO: are these associative tests even useful since it's encoded into the tree already?
const t: {name: string, op: string, commutative: boolean, associative: boolean}[] = [
    {
        name: "Union",
        op: "UNION",
        commutative: true,
        associative: true,
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
    {
        name: "Minus",
        op: "MINUS",
        commutative: false,
        associative: false,
    },
]

describe.each(t)("$op", (t2) => {
    test(`Identical ${t2.name} queries`, () => expectEquivalentQuery(createQuery(`{ ?s :A ?lA } ${t2.op} { ?s :l ?l }`),cb))

    test(`${t2.name} is${t2.commutative == false ? " not " : " "}commutative`, () => {
        t2.commutative === true ? expectCommutative(t2.op) : expectNotCommutative(t2.op);
    });
    test(`${t2.name} is${t2.associative == false ? " not " : " "}associative`, () => {
        t2.associative === true ? expectAssociative(t2.op) : expectNotAssociative(t2.op);
    })
})

test("Different operator types", () => {
    expectNotQueryEquivalence(createQuery(`{ ?s :A ?lA } UNION { ?s :l ?l }`), createQuery(`{ ?s :A ?lA } MINUS { ?s :l ?l }`),cb)
})

test("Order of project variables is irrelevant", () => {
    expectEquivalentQuery(`SELECT ?a ?b ?c {}`, cb)
    expectQueryEquivalence(`SELECT ?a ?b ?c {}`, `SELECT ?c ?a ?b {}`, cb)
})

test("Filter", () => {
    expectEquivalentQuery(createQuery(`?s ?x :y FILTER(STRLEN(?s) > 0)`), cb);
    expectNotQueryEquivalence(createQuery(`?s ?x :y FILTER(STRLEN(?s) > 0)`), createQuery(`?s ?x :y FILTER(STRLEN(?x) > 0)`), cb)
})