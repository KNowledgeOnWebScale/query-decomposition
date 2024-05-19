import assert from "node:assert/strict";

import { Algebra } from "sparqlalgebrajs";

export function decomposeQuery(root: Algebra.Project): Algebra.Project[] {
    if (root.input.type !== Algebra.types.UNION) {
        return [root];
    }

    const subqueryRoots = root.input.input;
    assert(subqueryRoots.every(elem => elem.type === Algebra.types.PROJECT));
    return subqueryRoots as Algebra.Project[];
}
