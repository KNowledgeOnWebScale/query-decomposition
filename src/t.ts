import { strict as assert } from 'assert';
import Denque from 'denque';
import { Algebra } from 'sparqlalgebrajs';
import {type OpWithInput, type WithOpInput} from "./lift-operator/utils.js"
import type { Multi, Single } from 'sparqlalgebrajs/lib/algebra.js';

// export type QueryNode<V extends Algebra.Operation, HasParent extends boolean | undefined = undefined> = {
//     value: V,
//     parent: HasParent extends undefined ? QueryNode<Algebra.Operation> | null: HasParent extends true ? QueryNode<Algebra.Operation> : null,
// }

export type QueryNode<V extends Algebra.Operation> = {
    value: V,
    parent: QueryNode<OpWithInput> | null,
}
export type QueryNodeWithParent<T extends Algebra.Operation> = QueryNode<T> & {parent: QueryNode<Algebra.Operation>}

function takesInputs(x: QueryNode<Algebra.Operation>): x is QueryNode<OpWithInput> {
    return "input" in x.value
}

// SKIP THE FIRST PROJECT AND ANY OPERATIONS IN SKIP_OPS THAT FOLLOW IT!
// TEST FOR NESTED UNION
export function findFirstOpOfTypeNotRoot<T extends OpWithInput>(opType: T["type"], root: Algebra.Operation): QueryNode<T> | null {
    const queue = new Denque<QueryNode<Algebra.Operation>>([{value: root, parent: null}]);

    while (!queue.isEmpty()) {
        const v = queue.shift()!;

        if (!takesInputs(v)) {
            continue;
        }

        if (v.value.type == opType && v.value !== root) {
            return v as QueryNode<T>;
        }

        if (Array.isArray(v.value.input)) {
            for (const child of v.value.input) {
                queue.push({ value: child, parent: v })
            }
        } else {
            queue.push({ value: v.value.input, parent: v })
        }
    }

    return null;
}

export function findDeepestOp(op: Algebra.Operation): Algebra.Operation[] | null {
    if (!("input" in op)) {
        // Undecomposable expression
        assert(op.type == Algebra.types.BGP)
        return null;
    }

    if (op.type == Algebra.types.UNION) {
        // currently moving only the first union operation upto the top
        return op.input;
    }

    const subOp = op.input;
    if (Array.isArray(subOp)) {
        assert(subOp.length > 0)
        let newSubOps = null;
        for (const subSubExpr of subOp) {
            newSubOps = findDeepestOp(subSubExpr);
            if (newSubOps !== null) {
                break; // TODO: what if both clauses can be decomposed?
            }
        }
        if (newSubOps === null) {
            return null;
        }
        assert(subOp.length == 2) // only handle binary operations

        const undecompSubExprIdx = subOp[0].type == Algebra.types.UNION ? 1 : 0; // TODO better way...

        const newOps = []
        for (const newSubExpr of newSubOps) {
            const newOp = structuredClone(op);
            newOp.input = undecompSubExprIdx == 0 ? [subOp[0], newSubExpr] : [newSubExpr, subOp[1]];
            newOps.push(newOp);
        }
        return newOps;
    } else {
        const newSubOps = findDeepestOp(subOp);

        if (newSubOps === null) {
            assert(false);
            return null;
        }

        if (op.type === Algebra.types.PROJECT) {
            return newSubOps.map<Algebra.Project>(
                (newSubExpr) => {
                    return {
                        type: Algebra.types.PROJECT,
                        variables: structuredClone(op.variables),
                        input: newSubExpr,
                    }
                }
            )
        } else {
            assert(false)
        }
    }
}