import { strict as assert } from "assert";

import { QueryTree } from "./query-tree/index.js";
import { moveUnionsToTop } from "./rewrite-unions/algorithm.js";

import type { ArrayMinLength } from "./utils.js";

export function maximallyDecomposeQuery(query: string): ArrayMinLength<string, 1> {
    const root = QueryTree.translate(query);
    assert(root.type === QueryTree.types.PROJECT);
    return maximallyDecomposeQueryTree(root).map(QueryTree.toSparql);
}

export function maximallyDecomposeQueryTree(root: QueryTree.Project): ArrayMinLength<QueryTree.Project, 1> {
    const normalizedRewrittenRoot = moveUnionsToTop(root);

    if (normalizedRewrittenRoot.input.type !== QueryTree.types.UNION) {
        return [normalizedRewrittenRoot];
    }

    const subqueryRoots = normalizedRewrittenRoot.input.input;
    assert(subqueryRoots.every(elem => elem.type === QueryTree.types.PROJECT));
    return subqueryRoots as ArrayMinLength<QueryTree.Project, 2>;
}
