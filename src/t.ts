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

export function takesInput(x: Algebra.Operation): x is OpWithInput {
    return "input" in x;
}

// Type guard on properties do not currently affect the parent type: https://github.com/microsoft/TypeScript/issues/42384
function NodeOpTakesInput(x: QueryNode<Algebra.Operation>): x is QueryNode<OpWithInput> {
    return takesInput(x.value);
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
    ignoreNodes: Algebra.Operation[] = [],
): QueryNode<T> | null {
    const queue = new Denque<QueryNode<Algebra.Operation>>([{ value: root, parent: null }]);

    while (!queue.isEmpty()) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const v = queue.shift()!;

        if (!NodeOpTakesInput(v)) {
            continue;
        }

        if (NodeOpIsOfType<T>(v, opType) && ![root, ...ignoreNodes].includes(v.value)) {
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

export function findFirstOpOfTypeNotRoot2<T extends OpWithInput>(
    opType: T["type"],
    root: Algebra.Operation,
    ignoreNodes: Algebra.Operation[] = [],
): QueryNode<T> | null {
    const stack = new Array<QueryNode<Algebra.Operation>>({ value: root, parent: null });

    while (stack.length !== 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const v = stack.pop()!;

        if (!NodeOpTakesInput(v)) {
            continue;
        }

        if (NodeOpIsOfType<T>(v, opType) && ![root, ...ignoreNodes].includes(v.value)) {
            return v;
        }

        if (Array.isArray(v.value.input)) {
            for (const [idx, child] of v.value.input.entries()) {
                stack.push({ value: child, parent: { value: v, childIdx: idx } });
            }
        } else {
            stack.push({ value: v.value.input, parent: { value: v, childIdx: 0 } });
        }
    }

    return null;
}
