import { expect } from "@jest/globals";
import createDebug from "debug";

import { PACKAGE_NAME } from "../../src/constants.js";
import { maximallyDecomposeQueryTree } from "../../src/index.js";
import { areEquivalent } from "../../src/query-tree/equivalence.js";
import { Algebra } from "../../src/query-tree/index.js";
import { toSparql } from "../../src/query-tree/translate.js";
import { areUnorderedEqual, type ArrayMinLength } from "../../src/utils.js";

import { OperandFactory as F } from "./operand-factory.js";

export type QueryTransformer = (query: Algebra.Project) => Algebra.Project;

export function expectQueryDecompBodiesEquivalence(
    cb: (
        f: F,
        ...bgps: Algebra.Bgp[]
    ) => { inputQueryBody: Algebra.Operand; expectedSubqueryBodies: ArrayMinLength<Algebra.Operand, 1> },
) {
    const f = new F();

    const { inputQueryBody, expectedSubqueryBodies } = cb(f, ...f.createBgps(12));
    const expectedSubqueries = expectedSubqueryBodies.map(x => F.createProject(x));

    const foundSubqueries = maximallyDecomposeQueryTree(F.createProject(inputQueryBody));

    if (!areUnorderedEqual(foundSubqueries, expectedSubqueries, areEquivalent)) {
        // const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), packageName));
        // fs.writeFileSync(path.join(tmpdir, "expected_tree.json"), JSON.stringify(expected, null, 4));
        // fs.writeFileSync(path.join(tmpdir, "found_tree.json"), JSON.stringify(found, null, 4));
        // console.error(`SPARQL Algebra trees where not equal, expected and found trees written to files in '${tmpdir}'`);
        throw Error("Found subqueries of decomposed input query does not unordered equal expected subqueries");
    }
}

export function expectSubqueryBodyDecompUnmodified(
    cb: (f: F, ...bgps: Algebra.Bgp[]) => { inputQueryBody: Algebra.Operand },
) {
    const f = new F();
    const { inputQueryBody } = cb(f, ...f.createBgps(12));

    const foundSubqueries = maximallyDecomposeQueryTree(F.createProject(inputQueryBody));
    expect(foundSubqueries).toHaveLength(1);

    expectQueryEquivalence(F.createProject(inputQueryBody), foundSubqueries[0]);
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

export function expectSubqueryDecompUnmodified(input: Algebra.Project) {
    const foundSubqueries = maximallyDecomposeQueryTree(input);
    expect(foundSubqueries).toHaveLength(1);

    expectQueryEquivalence(foundSubqueries[0], input);
}

const debug = createDebug(`${PACKAGE_NAME}:query-equivalence`);

export function expectQueryEquivalence(input: Algebra.Project, expected: Algebra.Project, cb?: QueryTransformer) {
    const found = cb !== undefined ? cb(input) : input;

    debug("found:", toSparql(found));
    debug("expected:", toSparql(expected));

    if (!areEquivalent(found, expected)) {
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

    if (areEquivalent(found, expected)) {
        // const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), packageName));
        // fs.writeFileSync(path.join(tmpdir, "expected_tree.json"), JSON.stringify(expected, null, 4));
        // fs.writeFileSync(path.join(tmpdir, "found_tree.json"), JSON.stringify(found, null, 4));
        // console.error(`SPARQL Algebra trees where equal, expected and found trees written to files in '${tmpdir}'`)

        throw Error("Expected queries to not be equivalent");
    }
}
