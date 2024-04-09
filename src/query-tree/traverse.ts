import { Algebra } from "./index.js";

export interface QueryNode<T extends Algebra.Operand> {
    value: T;
    parentIdx: number | null;
}
export type QueryNodeWithParent<T extends Algebra.Operand> = QueryNode<T> & {
    parentIdx: NonNullable<QueryNode<T>["parentIdx"]>;
};

export interface QueryNodeWithAncestors<V extends Algebra.Operand> {
    ancestors: QueryNode<Algebra.Operation>[];
    value: QueryNode<V>;
}

export function findFirstOpOfType<K extends Algebra.Operation["type"]>(
    opType: K,
    root: Algebra.Operation,
    ignoredNodes = new Set<Algebra.Operation>(),
): QueryNodeWithAncestors<Algebra.OpTypeMapping[K]> | null {
    // Keep state needed for traversal separate, so we can directly return the ancestors
    const ancestors: QueryNode<Algebra.Operation>[] = [{ value: root, parentIdx: null }];
    const ancestorsNextChildToVisitIdx: number[] = [0];

    let node = ancestors.at(-1);
    let nextChildToVisitIdx = ancestorsNextChildToVisitIdx.at(-1);
    while (node !== undefined && nextChildToVisitIdx !== undefined) {
        const nodeOp = node.value;

        let nextToVisit = null;
        if (Array.isArray(nodeOp.input)) {
            if (nextChildToVisitIdx < nodeOp.input.length) {
                nextToVisit = nodeOp.input[nextChildToVisitIdx];
            }
        } else {
            if (nextChildToVisitIdx === 0) {
                nextToVisit = nodeOp.input;
            }
        }
        if (nextToVisit !== null) {
            ancestorsNextChildToVisitIdx[ancestorsNextChildToVisitIdx.length - 1] += 1;
            if (isOp(nextToVisit)) {
                ancestors.push({ value: nextToVisit, parentIdx: nextChildToVisitIdx });
                ancestorsNextChildToVisitIdx.push(0);
            }
        } else {
            // All of the node's children have been visited
            const v = ancestors.pop()!;
            ancestorsNextChildToVisitIdx.pop();
            if (Algebra.isOfOpType(nodeOp, opType) && !ignoredNodes.has(nodeOp)) {
                return { ancestors: ancestors, value: { value: nodeOp, parentIdx: v.parentIdx } };
            }
        }

        node = ancestors.at(-1);
        nextChildToVisitIdx = ancestorsNextChildToVisitIdx.at(-1);
    }

    return null;
}

function isOp(x: Algebra.Operand): x is Algebra.Operation {
    return "input" in x;
}
