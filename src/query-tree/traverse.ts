import { strict as assert } from "assert";

import Denque from "denque";

import { Algebra } from "./index.js";

export interface QueryNode<T extends Algebra.Operation> {
    value: T;
    parentIdx: number | null;
}
export type QueryNodeWithParent<T extends Algebra.Operation> = QueryNode<T> & {
    parentIdx: NonNullable<QueryNode<T>["parentIdx"]>;
};

export interface QueryNodeWithAncestors<V extends Algebra.Operation> {
    ancestors: Denque<QueryNode<Algebra.Operation>>;
    value: QueryNodeWithParent<V>;
}

function checkNode<K extends Algebra.Operation["type"]>(
    searchCriteria: { opType: K; ignoreNodes: Set<Algebra.Operation> },
    node: Algebra.Operand,
    parentIdx: number | null,
): QueryNodeWithAncestors<Algebra.OpTypeMapping[K]> | null {
    if (!isOp(node)) {
        return null;
    }

    let ret: ReturnType<typeof checkNode<K>> = null;
    if (Array.isArray(node.input)) {
        for (const [idx, child] of node.input.entries()) {
            ret = checkNode(searchCriteria, child, idx);
            if (ret !== null) {
                break;
            }
        }
    } else {
        ret = checkNode(searchCriteria, node.input, 0);
    }
    if (ret !== null) {
        ret.ancestors.unshift({ value: node, parentIdx });
        return ret;
    }

    if (Algebra.isOfOpType(node, searchCriteria.opType) && !searchCriteria.ignoreNodes.has(node)) {
        assert(parentIdx !== null);
        return { ancestors: new Denque(), value: { value: node, parentIdx } };
    }

    return null;
}

export function findFirstOpOfTypeNotRoot<K extends Algebra.Operation["type"]>(
    opType: K,
    root: Algebra.Operation,
    ignoreNodes = new Set<Algebra.Operation>(),
): QueryNodeWithAncestors<Algebra.OpTypeMapping[K]> | null {
    return checkNode({ opType: opType, ignoreNodes: new Set([...ignoreNodes, root]) }, root, null);
}

function isOp(x: Algebra.Operand): x is Algebra.Operation {
    return "input" in x;
}
