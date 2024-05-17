import { strict as assert } from "assert";

import { QueryTree } from "./query-tree/index.js";
import { BINARY_OPS_LEFT_DISTR_TYPES, rewriteUnionsToTop } from "./rewrite-unions/algorithm.js";

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
    let rewrittenRoot = rewriteUnionsToTop(root, unionNodeWAncestors => {
        // Check if union operation occurs in right-hand side operand of an operator present in `BINARY_OPS_LEFT_DISTR_TYPES`
        const pathToUnionNode = [...unionNodeWAncestors.ancestors, unionNodeWAncestors.value];
        for (let i = 0; i < pathToUnionNode.length - 1; i++) {
            const parent = pathToUnionNode[i]!;
            const v = pathToUnionNode[i + 1]!;
            if (QueryTree.isOneOfTypes(parent.value, BINARY_OPS_LEFT_DISTR_TYPES) && v.parentIdx === 1) {
                return i;
            }
        }
        return null;
    });
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
