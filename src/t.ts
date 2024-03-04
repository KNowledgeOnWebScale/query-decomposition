import { strict as assert } from "assert";
import Denque from "denque";
import { Algebra } from "sparqlalgebrajs";
import { type OpWithInput, type WithOpInput } from "./lift-operator/utils.js";

export type QueryNode<V extends Algebra.Operation> = {
    value: V;
    parent: QueryNode<OpWithInput> | null;
};
export type QueryNodeWithParent<T extends Algebra.Operation> = QueryNode<T> & { parent: QueryNode<Algebra.Operation> };

function takesInputs(x: QueryNode<Algebra.Operation>): x is QueryNode<OpWithInput> {
    return "input" in x.value;
}

export function findFirstOpOfTypeNotRoot<T extends OpWithInput>(
    opType: T["type"],
    root: Algebra.Operation,
): QueryNode<T> | null {
    const queue = new Denque<QueryNode<Algebra.Operation>>([{ value: root, parent: null }]);

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
                queue.push({ value: child, parent: v });
            }
        } else {
            queue.push({ value: v.value.input, parent: v });
        }
    }

    return null;
}
