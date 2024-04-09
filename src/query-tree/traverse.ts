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

interface State {
    path: QueryNode<Algebra.Operation>[];
    pathNextChildToVisitIdx: number[];
}

export function findFirstOpOfType<K extends Algebra.Operation["type"]>(
    opType: K,
    root: Algebra.Operation,
    ignoredNodes = new Set<Algebra.Operation>(),
    state?: State,
): [QueryNodeWithAncestors<Algebra.OpTypeMapping[K]>, State] | null {
    // Keep state needed for traversal separate, so we can directly return the ancestors
    const path = state?.path ?? [{ value: root, parentIdx: null }];
    const pathNextChildToVisitIdx = state?.pathNextChildToVisitIdx ?? [0];

    let node = path.at(-1);
    let nextChildToVisitIdx = pathNextChildToVisitIdx.at(-1);
    while (node !== undefined && nextChildToVisitIdx !== undefined) {
        const nodeOp = node.value;

        let nextToVisit: Algebra.Operand | null = null;
        if (Array.isArray(nodeOp.input)) {
            if (nextChildToVisitIdx < nodeOp.input.length) {
                nextToVisit = nodeOp.input[nextChildToVisitIdx]!;
            }
        } else {
            if (nextChildToVisitIdx === 0) {
                nextToVisit = nodeOp.input;
            }
        }
        if (nextToVisit !== null) {
            pathNextChildToVisitIdx[pathNextChildToVisitIdx.length - 1] += 1;
            if (isOp(nextToVisit)) {
                path.push({ value: nextToVisit, parentIdx: nextChildToVisitIdx });
                pathNextChildToVisitIdx.push(0);
            }
        } else {
            // All of the node's children have been visited
            const v = path.pop()!;
            pathNextChildToVisitIdx.pop();
            if (Algebra.isOfOpType(nodeOp, opType) && !ignoredNodes.has(nodeOp)) {
                return [
                    { ancestors: path, value: { value: nodeOp, parentIdx: v.parentIdx } },
                    { path, pathNextChildToVisitIdx },
                ];
            }
        }

        node = path.at(-1);
        nextChildToVisitIdx = pathNextChildToVisitIdx.at(-1);
    }

    return null;
}

function isOp(x: Algebra.Operand): x is Algebra.Operation {
    return "input" in x;
}
