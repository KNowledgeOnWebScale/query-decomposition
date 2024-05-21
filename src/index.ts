import { strict as assert } from "assert";

import { QueryTree } from "./query-tree/index.js";
import { rewriteUnionsToTop } from "./rewrite-unions/algorithm.js";

import type { ArrayMinLength } from "./utils.js";

export function maximallyDecomposeSelectQuery(query: string): ArrayMinLength<string, 1> {
    const root = QueryTree.translate(query);
    assert(root.type === QueryTree.types.PROJECT);
    return maximallyDecomposeSelectQueryTree(root).map(x => QueryTree.toSparql(x));
}

export function maximallyDecomposeSelectQueryTree(root: QueryTree.Project): ArrayMinLength<QueryTree.Project, 1> {
    return maximallyDecomposeSelectQueryTree_(structuredClone(root));
}

function maximallyDecomposeSelectQueryTree_(root: QueryTree.Project): ArrayMinLength<QueryTree.Project, 1> {
    const qVariables = root.variables;
    let rewrittenRoot = rewriteUnionsToTop(root);
    if (rewrittenRoot.type !== QueryTree.types.PROJECT) {
        rewrittenRoot = {
            type: QueryTree.types.PROJECT,
            variables: qVariables,
            input: rewrittenRoot,
        };
    }
    return decomposeSelectQueryTree(rewrittenRoot);
}

export function decomposeSelectQueryTree(root: QueryTree.Project): ArrayMinLength<QueryTree.Project, 1> {
    if (root.input.type !== QueryTree.types.UNION) {
        return [root];
    }

    const subqueryRoots = root.input.input;
    assert(subqueryRoots.every(elem => elem.type === QueryTree.types.PROJECT));
    return subqueryRoots as ArrayMinLength<QueryTree.Project, 2>;
}
