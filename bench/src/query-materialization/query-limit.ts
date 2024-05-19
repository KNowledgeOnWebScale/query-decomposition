import assert from "node:assert/strict";

import { QueryTree } from "move-sparql-unions-to-top/src/query-tree/index.js";
import { moveUnionsToTop } from "move-sparql-unions-to-top/src/rewrite-unions/algorithm.js";
import { Algebra, translate } from "sparqlalgebrajs";

import { queryTreeToSparql } from "../utils.js";

import { decomposeQuery } from "./decompose-query.js";

const SINGLE_QUERY_LIMIT = 9_000;

export function getQueryLimit(queryS: string): { query: number; subquery: number } {
    const query = QueryTree.translate(queryS);
    assert(query.type === QueryTree.types.PROJECT);
    const rewrittenQuery = moveUnionsToTop(query);
    const rewrittenQueryTree = translate(queryTreeToSparql(rewrittenQuery));
    assert(rewrittenQueryTree.type === Algebra.types.PROJECT);
    const subqueries = decomposeQuery(rewrittenQueryTree);

    return {
        query: Math.floor(SINGLE_QUERY_LIMIT / subqueries.length) * subqueries.length,
        subquery: Math.floor(SINGLE_QUERY_LIMIT / subqueries.length),
    };
}
