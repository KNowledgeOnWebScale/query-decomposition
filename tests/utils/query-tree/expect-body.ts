import { maximallyDecomposeQueryTree } from "../../../src/index.js";
import { QueryTree } from "../../../src/query-tree/index.js";
import { areUnorderedEqual, type ArrayMinLength } from "../../../src/utils.js";

import { OperandFactory as F } from "./../operand-factory.js";
import { areEquivalent } from "./../query-tree/equivalence.js";
import { expectNotQueryEquivalence, expectQueryEquivalence } from "./expect.js";

export type QueryTransformer = (query: QueryTree.Project) => QueryTree.Project;

export function expectQueryDecompBodiesEquivalence(
    cb: (
        f: F,
        ...bgps: QueryTree.Bgp[]
    ) => { inputQueryBody: QueryTree.Operand; expectedSubqueryBodies: ArrayMinLength<QueryTree.Operand, 1> },
): void {
    const f = new F();

    const { inputQueryBody, expectedSubqueryBodies } = cb(f, ...f.createBgps(12));
    const expectedSubqueries = expectedSubqueryBodies.map(x => F.createProject(x));

    const input = F.createProject(inputQueryBody);
    const foundSubqueries = maximallyDecomposeQueryTree(input);

    if (!areUnorderedEqual(foundSubqueries, expectedSubqueries, areEquivalent)) {
        // const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), packageName));
        // fs.writeFileSync(path.join(tmpdir, "expected_tree.json"), JSON.stringify(expected, null, 4));
        // fs.writeFileSync(path.join(tmpdir, "found_tree.json"), JSON.stringify(found, null, 4));
        // console.error(`SPARQL Algebra trees where not equal, expected and found trees written to files in '${tmpdir}'`);
        throw Error("Found subqueries of decomposed input query does not unordered equal expected subqueries");
    }
}

export function expectQueryBodyEquivalence(
    cb: (f: F, ...bgps: QueryTree.Bgp[]) => { inputQueryBody: QueryTree.Operand; expectedQueryBody: QueryTree.Operand },
): void {
    const f = new F();

    const { inputQueryBody, expectedQueryBody } = cb(f, ...f.createBgps(12));
    const expected = F.createProject(expectedQueryBody);

    const input = F.createProject(inputQueryBody);

    expectQueryEquivalence(input, expected);
}

export function expectNotQueryBodyEquivalence(
    cb: (f: F, ...bgps: QueryTree.Bgp[]) => { inputQueryBody: QueryTree.Operand; expectedQueryBody: QueryTree.Operand },
): void {
    const f = new F();

    const { inputQueryBody, expectedQueryBody } = cb(f, ...f.createBgps(12));
    const expected = F.createProject(expectedQueryBody);

    const input = F.createProject(inputQueryBody);

    expectNotQueryEquivalence(input, expected);
}
