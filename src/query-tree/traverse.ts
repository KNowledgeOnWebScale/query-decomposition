import Denque from "denque";

import { Algebra } from "./index.js";

export interface QueryNode<V extends Algebra.Operand, P extends Algebra.Operation = Algebra.Operation> {
    value: V;
    parent: { value: QueryNode<P>; childIdx: number } | null;
}
export type QueryNodeWithParent<V extends Algebra.Operand, P extends Algebra.Operation = Algebra.Operation> = QueryNode<
    V,
    P
> & {
    parent: NonNullable<QueryNode<V, P>["parent"]>;
};

function isOp(x: Algebra.Operand): x is Algebra.Operation {
    return "input" in x;
}

// Type guard on properties do not currently affect the parent type: https://github.com/microsoft/TypeScript/issues/42384
function hasChildren(x: QueryNode<Algebra.Operand>): x is QueryNode<Algebra.Operation> {
    return isOp(x.value);
}

// Type guard on properties do not currently affect the parent type: https://github.com/microsoft/TypeScript/issues/42384
function isNodeOpOfType<T extends Algebra.Operation>(
    node: QueryNode<Algebra.Operation>,
    opType: T["type"],
): node is QueryNode<T> {
    return Algebra.isOfOpType(node.value, opType);
}

export function hasParent<V extends Algebra.Operation, P extends Algebra.Operation = Algebra.Operation>(
    node: QueryNode<V, P>,
): node is QueryNodeWithParent<V, P> {
    return node.parent !== null;
}

export function findFirstOpOfTypeNotRoot<T extends Algebra.Operation>(
    opType: T["type"],
    root: Algebra.Operation,
    ignoreNodes: Algebra.Operation[] = [],
): QueryNode<T> | null {
    const queue = new Denque<QueryNode<Algebra.Operand>>([{ value: root, parent: null }]);

    while (!queue.isEmpty()) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const v = queue.shift()!;

        if (!hasChildren(v)) {
            continue;
        }

        if (isNodeOpOfType<T>(v, opType) && ![root, ...ignoreNodes].includes(v.value)) {
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

export function findFirstOpOfTypeNotRoot2<T extends Algebra.Operation>(
    opType: T["type"],
    root: Algebra.Operation,
    ignoreNodes: Algebra.Operation[] = [],
): QueryNode<T> | null {
    const stack = new Array<QueryNode<Algebra.Operand>>({ value: root, parent: null });

    while (stack.length !== 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const v = stack.pop()!;

        if (!hasChildren(v)) {
            continue;
        }

        if (isNodeOpOfType<T>(v, opType) && ![root, ...ignoreNodes].includes(v.value)) {
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
