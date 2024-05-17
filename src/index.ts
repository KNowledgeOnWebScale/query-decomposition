import { strict as assert } from "assert";

import { QueryTree } from "./query-tree/index.js";
import { rewriteUnionsToTop } from "./rewrite-unions/algorithm.js";

import type { ArrayMinLength } from "./utils.js";

export function maximallyDecomposeQuery(query: string): ArrayMinLength<string, 1> {
    const root = QueryTree.translate(query);
    assert(root.type === QueryTree.types.PROJECT);
    return maximallyDecomposeQueryTree(root).map(x => QueryTree.toSparql(x));
}

export function maximallyDecomposeQueryTree(root: QueryTree.Project): ArrayMinLength<QueryTree.Project, 1> {
    return maximallyDecomposeQueryTree_(structuredClone(root));
}

function maximallyDecomposeQueryTree_(root: QueryTree.Project): ArrayMinLength<QueryTree.Project, 1> {
    return decomposeQueryTree(rewriteUnionsToTop(root));
}

export function decomposeQueryTree(root: QueryTree.Project): ArrayMinLength<QueryTree.Project, 1> {
    if (root.input.type !== QueryTree.types.UNION) {
        return [root];
    }

    const subqueryRoots = root.input.input;
    assert(subqueryRoots.every(elem => elem.type === QueryTree.types.PROJECT));
    return subqueryRoots as ArrayMinLength<QueryTree.Project, 2>;
}
