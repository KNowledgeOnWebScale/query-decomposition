import { expect } from "@jest/globals";
import createDebug from "debug";

import { name as packageName } from "../../package.json";
import { moveUnionsToTop } from "../../src/lift-operator/union.js";
import { areEqualOps } from "../../src/query-tree/compare.js";
import { Algebra } from "../../src/query-tree/index.js";
import { toSparql } from "../../src/query-tree/translate.js";

import { OperandFactory as F } from "./operand-factory.js";

import type { ArrayMinLength } from "../../src/utils.js";

export type QueryTransformer = (query: Algebra.Project) => Algebra.Project;

export function expectQueryDecompBodiesEquivalence(
    cb: (
        f: F,
        ...bgps: Algebra.Bgp[]
    ) => { input: Algebra.Operand; expectedSubqueries: ArrayMinLength<Algebra.Operand, 2> },
) {
    const f = new F();
    const { input, expectedSubqueries } = cb(f, ...f.createBgps(12));

    const expected = F.createProject(F.createUnion(...expectedSubqueries.map(q => F.createProject(q))));

    expectQueryEquivalence(F.createProject(input), expected, moveUnionsToTop);
}

export function expectQueryBodyEquivalence(
    cb: (f: F, ...bgps: Algebra.Bgp[]) => { input: Algebra.Operand; expected: Algebra.Operand },
    qt?: QueryTransformer,
) {
    const f = new F();
    const { input, expected } = cb(f, ...f.createBgps(8));

    expectQueryEquivalence(F.createProject(input), F.createProject(expected), qt);
}

export function expectQueryBodyUnmodified(
    cb: (f: F, ...bgps: Algebra.Bgp[]) => { input: Algebra.Operand },
    qt?: QueryTransformer,
) {
    const f = new F();
    const { input } = cb(f, ...f.createBgps(8));

    expectQueryEquivalence(F.createProject(input), F.createProject(input), qt);
}

export function expectNotQueryBodyEquivalence(
    cb: (f: F, ...bgps: Algebra.Bgp[]) => { input: Algebra.Operand; expected: Algebra.Operand },
    qt?: QueryTransformer,
) {
    const f = new F();
    const { input, expected } = cb(f, ...f.createBgps(8));

    expectNotQueryEquivalence(F.createProject(input), F.createProject(expected), qt);
}

const debug = createDebug(`${packageName}:query-equivalence`);

export function expectQueryEquivalence(input: Algebra.Project, expected: Algebra.Project, cb?: QueryTransformer) {
    const found = cb !== undefined ? cb(input) : input;

    debug("found:", toSparql(found));
    debug("expected:", toSparql(expected));

    if (!areEqualOps(found, expected)) {
        // const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), packageName));
        // fs.writeFileSync(path.join(tmpdir, "expected_tree.json"), JSON.stringify(expected, null, 4));
        // fs.writeFileSync(path.join(tmpdir, "found_tree.json"), JSON.stringify(found, null, 4));
        // console.error(`SPARQL Algebra trees where not equal, expected and found trees written to files in '${tmpdir}'`);

        // This comparison is order sensitive, while the above one is correctly not...
        // Therefore, this output might be slightly misleading, but is still better then nothing
        expect(toSparql(found)).toEqual(toSparql(expected));

        // Trees translated to query strings are equal, but the trees are not...
        expect(found).toEqual(expected);
    }
}

export function expectQueryUnmodified(input: Algebra.Project, qt?: QueryTransformer) {
    return expectQueryEquivalence(input, input, qt);
}

export function expectNotQueryEquivalence(input: Algebra.Project, expected: Algebra.Project, qt?: QueryTransformer) {
    const found = qt !== undefined ? qt(input) : input;

    debug("found:", toSparql(found));
    debug("expected:", toSparql(expected));

    if (areEqualOps(found, expected)) {
        // const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), packageName));
        // fs.writeFileSync(path.join(tmpdir, "expected_tree.json"), JSON.stringify(expected, null, 4));
        // fs.writeFileSync(path.join(tmpdir, "found_tree.json"), JSON.stringify(found, null, 4));
        // console.error(`SPARQL Algebra trees where equal, expected and found trees written to files in '${tmpdir}'`)

        throw Error("Expected queries to not be equivalent");
    }
}
