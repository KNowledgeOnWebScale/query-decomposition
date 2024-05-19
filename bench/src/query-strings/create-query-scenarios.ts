import { strict as assert } from "node:assert";

import { QueryTree } from "move-sparql-unions-to-top/src/query-tree/index.js";
import { moveUnionsToTop } from "move-sparql-unions-to-top/src/rewrite-unions/algorithm.js";
import { Algebra, translate } from "sparqlalgebrajs";

import { decomposeQuery } from "../query-materialization/decompose-query.js";
import { algebraToSparql as algebraToSparql, queryTreeToSparql } from "../utils.js";

export function getQueryStringScenarios(queryS: string): { changeOne: string[]; onlyOne: string[] } {
    assert(isUnionRewritable(queryS), "Union is not rewritable: " + queryS);

    const q = translate(queryS);
    assert(q.type === Algebra.types.PROJECT);

    const union = findFirstOfType(Algebra.types.UNION, q);
    assert(union !== null);

    const ret: ReturnType<typeof getQueryStringScenarios> = { changeOne: [], onlyOne: [] };
    for (let i = 0; i < union.input.length; i++) {
        {
            const qC = structuredClone(q);
            const union2 = findFirstOfType(Algebra.types.UNION, qC);
            assert(union2 !== null && union2.input.length >= 2);
            union2.input = [union2.input[i]!];
            // Roundtrip to ensure that the union is fully erased
            ret.onlyOne.push(algebraToSparql(translate(algebraToSparql(qC)) as Algebra.Project));
        }
        {
            const qC2 = structuredClone(q);
            const union22 = findFirstOfType(Algebra.types.UNION, qC2);
            assert(union22 !== null && union22.input.length >= 2);
            changeFirstBGP(union22.input[i]!);
            ret.changeOne.push(algebraToSparql(qC2));
        }
    }
    return ret;
}

function findFirstOfType<K extends Algebra.Operation["type"]>(
    type: K,
    node: Algebra.Operation,
): Algebra.TypedOperation<K> | null {
    if (node.type === type) {
        return node as Algebra.TypedOperation<K>;
    }

    if (!("input" in node)) {
        return null;
    }

    if (Array.isArray(node.input)) {
        for (const inp of node.input as Algebra.Operation[]) {
            const ret = findFirstOfType(type, inp);
            if (ret !== null) {
                return ret;
            }
        }
        return null;
    } else {
        return findFirstOfType(type, node.input as Algebra.Operation);
    }
}

function changeFirstBGP(node: Algebra.Operation) {
    const bgp = findFirstOfType(Algebra.types.BGP, node);
    assert(bgp !== null && bgp.patterns.length > 0);
    bgp.patterns[0]!.predicate.value += "2";
}

function isUnionRewritable(queryS: string): boolean {
    const query = QueryTree.translate(queryS);
    assert(query.type === QueryTree.types.PROJECT);
    const rewrittenQuery = moveUnionsToTop(query);
    const rewrittenQueryTree = translate(queryTreeToSparql(rewrittenQuery));
    assert(rewrittenQueryTree.type === Algebra.types.PROJECT);
    const subqueries = decomposeQuery(rewrittenQueryTree);

    return subqueries.length > 1;
}
