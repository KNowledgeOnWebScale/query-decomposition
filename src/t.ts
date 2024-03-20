import Denque from "denque";
import { Algebra } from "sparqlalgebrajs";

import { type OpWithInput } from "./lift-operator/utils.js";

export interface QueryNode<V extends Algebra.Operation, P extends OpWithInput = OpWithInput> {
    value: V;
    parent: { value: QueryNode<P>; childIdx: number } | null;
}
export type QueryNodeWithParent<V extends Algebra.Operation, P extends OpWithInput = OpWithInput> = QueryNode<V, P> & {
    parent: NonNullable<QueryNode<V, P>["parent"]>;
};

function takesInputs(x: QueryNode<Algebra.Operation>): x is QueryNode<OpWithInput> {
    return "input" in x.value;
}

function OpIsOfType<T extends Algebra.Operation>(x: Algebra.Operation, opType: T["type"]): x is T {
    return x.type === opType;
}

// Type guard on properties do not currently affect the parent type: https://github.com/microsoft/TypeScript/issues/42384
function NodeOpIsOfType<T extends Algebra.Operation>(
    node: QueryNode<Algebra.Operation>,
    opType: T["type"],
): node is QueryNode<T> {
    return OpIsOfType(node.value, opType);
}

export function hasParent<V extends Algebra.Operation, P extends OpWithInput = OpWithInput>(
    node: QueryNode<V, P>,
): node is QueryNodeWithParent<V, P> {
    return node.parent !== null;
}

export function findFirstOpOfTypeNotRoot<T extends OpWithInput>(
    opType: T["type"],
    root: Algebra.Operation,
): QueryNode<T> | null {
    const queue = new Denque<QueryNode<Algebra.Operation>>([{ value: root, parent: null }]);

    while (!queue.isEmpty()) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const v = queue.shift()!;

        if (!takesInputs(v)) {
            continue;
        }

        if (NodeOpIsOfType<T>(v, opType) && v.value !== root) {
            return v;
        }

        if (Array.isArray(v.value.input)) {
            for (const [idx, child] of v.value.input.entries()) {
                queue.push({ value: child, parent: { value: v, childIdx: idx } });
            }
        } else {
            queue.push({ value: v.value.input, parent: { value: v, childIdx: 0 } });
        }
    }

    return null;
}
