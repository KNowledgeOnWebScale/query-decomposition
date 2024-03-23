import { strict as assert } from "assert";

import { expect } from "@jest/globals";
import { Algebra, toSparql, translate } from "sparqlalgebrajs";

import { areEqualOps } from "../tests/compare-queries.js";
import type { Expect } from "expect";

export type QueryProducer = (input: string) => Algebra.Project;

function queryEquivalence(input: string, expected: string, cb: QueryProducer, expect_: Expect) {
}

export function expectQueryEquivalence(input: string, expected: string, cb: QueryProducer) {
    //console.log(toSparql(q));
    //console.log("=============================")
    //console.log(toSparql(translate(expected)))
    const expected_ = translate(expected);
    const input_ = cb(input);
    if (!areEqualOps(input_, expected_)) {
        // This comparison is order sensitive, while the above one is correctly not...
        // Therefore, this output might be slightly misleading, but is still better then nothing
        expect(toSparql(input_)).toEqual(toSparql(expected_));
    }
}

export function expectNotQueryEquivalence(input: string, expected: string, cb: QueryProducer) {
    //console.log(toSparql(q));
    //console.log("=============================")
    //console.log(toSparql(translate(expected)))
    const input_ = cb(input);
    const expected_ = translate(expected);
    if (areEqualOps(input_, expected_)) {
        throw(`Expected queries to not be equivalent:\n${toSparql(translate(input))}\n${toSparql(translate(expected))}`);
    }
}

export function expectEquivalentQuery(input: string, cb: QueryProducer) {
    expectQueryEquivalence(input, input, cb);
}