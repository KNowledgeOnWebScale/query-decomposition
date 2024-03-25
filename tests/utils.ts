import { strict as assert } from "assert";

import { expect } from "@jest/globals";

import { areEqualOps } from "../src/query-tree/compare.js";
import { toSparql, translate } from "../src/query-tree/translate.js";
import { Algebra } from "../src/query-tree/index.js";

export type QueryProducer = (input: string) => Algebra.Project;

export function expectQueriesToBeEquivalent(input: string, expected: string, cb: QueryProducer) {
    //console.log(toSparql(q));
    //console.log("=============================")
    //console.log(toSparql(translate(expected)))
    const expected_ = translate(expected);
    assert(expected_.type == Algebra.types.PROJECT);
    const input_ = cb(input);
    if (!areEqualOps(input_, expected_)) {
        // This comparison is order sensitive, while the above one is correctly not...
        // Therefore, this output might be slightly misleading, but is still better then nothing
        expect(toSparql(input_)).toEqual(toSparql(expected_));
    }
}

export function expectQueriesToNotBeEquivalent(input: string, expected: string, cb: QueryProducer) {
    //console.log(toSparql(q));
    //console.log("=============================")
    //console.log(toSparql(translate(expected)))
    const input_ = cb(input);
    const expected_ = translate(expected);
    assert(expected_.type == Algebra.types.PROJECT);

    if (areEqualOps(input_, expected_)) {
        throw(`Expected queries to not be equivalent:\n${toSparql(input_)}\n${toSparql(expected_)}`);
    }
}

export function expectQueryToBeUnmodified(input: string, cb: QueryProducer) {
    return expectQueriesToBeEquivalent(input, input, cb);
}