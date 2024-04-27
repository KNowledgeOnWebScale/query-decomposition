import { strict as assert } from "assert";

import { Algebra } from "./query-tree/index.js";
import { toSparql, translate } from "./query-tree/translate.js";
import { moveUnionsToTop } from "./rewrite-unions/algorithm.js";

import type { ArrayMinLength } from "./utils.js";

export { Algebra };

export function maximallyDecomposeQuery(query: string): ArrayMinLength<string, 1> {
    return maximallyDecomposeQueryString_(query).map(toSparql);
}

function maximallyDecomposeQueryString_(query: string): ArrayMinLength<Algebra.Project, 1> {
    const root = translate(query);
    assert(root.type === Algebra.types.PROJECT);
    return maximallyDecomposeQueryTree(root);
}

export function maximallyDecomposeQueryTree(root: Algebra.Project): ArrayMinLength<Algebra.Project, 1> {
    const normalizedRewrittenRoot = moveUnionsToTop(root);

    if (normalizedRewrittenRoot.input.type !== Algebra.types.UNION) {
        return [normalizedRewrittenRoot];
    }

    const subqueryRoots = normalizedRewrittenRoot.input.input;
    assert(subqueryRoots.every(elem => elem.type === Algebra.types.PROJECT));
    return subqueryRoots as ArrayMinLength<Algebra.Project, 2>;
}
