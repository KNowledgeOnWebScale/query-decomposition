import { expect } from "@jest/globals";
import createDebug from "debug";

import { PACKAGE_NAME } from "../../../src/constants.js";
import { QueryTree } from "../../../src/query-tree/index.js";
import { toSparql } from "../../../src/query-tree/translate.js";

import { areEquivalent } from "./../query-tree/equivalence.js";

const debug = createDebug(`${PACKAGE_NAME}:query-equivalence`);

export function expectQueryEquivalence(found: QueryTree.Project, expected: QueryTree.Project): void {
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

export function expectNotQueryEquivalence(found: QueryTree.Project, expected: QueryTree.Project): void {
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
