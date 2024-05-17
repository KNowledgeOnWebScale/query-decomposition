import { strict as assert } from "assert";

import { QueryTree } from "../query-tree/index.js";
import { SetC } from "../utils.js";

import { rewriteUnionToAboveBinaryOrMoreOp, rewriteUnionToAboveUnaryOp } from "./rules.js";

/**
 * @returns The index of the first bad node from the root if present
 */
export type AdditionalChecksCb = (unionWAncestors: QueryTree.QueryNodeWithAncestors<QueryTree.Union>) => number | null;

export function rewriteUnionsToTop<T extends QueryTree.Operation>(
    root: T,
    additionalChecksCb?: AdditionalChecksCb,
): T | QueryTree.Union {
    let newRoot: T | QueryTree.Union = root;

    const ignoredUnions = new SetC<QueryTree.Union>(); // Unions that cannot be moved all the way up
    const ignoredSubtrees = new SetC<QueryTree.Operation>();
    let traversalState: QueryTree.TraversalState | undefined = undefined;
    while (true) {
        const traversalResult: ReturnType<typeof QueryTree.findFirstOpOfType<QueryTree.types.UNION>> =
            QueryTree.findFirstOpOfType(QueryTree.types.UNION, newRoot, ignoredSubtrees, ignoredUnions, traversalState);
        if (traversalResult === null) {
            break; // No (more) unions to move
        }
        const unionOpWAncestors = traversalResult[0];
        traversalState = traversalResult[1];

        try {
            newRoot = rewriteUnionToTop(unionOpWAncestors, additionalChecksCb);
            ignoredUnions.add(newRoot); // Skip top-level unions
            traversalState = undefined; // Tree has changed
            // console.log(
            //     QueryTree.toSparql({
            //         type: QueryTree.types.PROJECT,
            //         variables: inScopeVariables(newRoot),
            //         input: newRoot,
            //     }),
            // );
        } catch (err) {
            assert(err instanceof BadNodeError);
            // Skip all nodes under the bad node, since we are in the RHS of a minus or left-join so no nodes can be moved from under it anymore (LHS could be but is already done)
            ignoredSubtrees.add(traversalState!.path[err.badNodeIdx]!.value);

            // Avoid a having to traverse to this node again, only to skip it
            traversalState!.path.length = err.badNodeIdx;
            traversalState!.pathNextChildToVisitIdx.length = err.badNodeIdx;
        }
    }

    return newRoot;
}

export function rewriteUnionToTop(
    unionWAncestors: QueryTree.QueryNodeWithAncestors<QueryTree.Union>,
    additionalChecksCb?: AdditionalChecksCb,
): QueryTree.Union {
    if (additionalChecksCb !== undefined) {
        const badNodeIdx = additionalChecksCb(unionWAncestors);
        if (badNodeIdx !== null) {
            throw new BadNodeError(badNodeIdx);
        }
    }

    let unionOp = unionWAncestors.value.value;
    while (unionWAncestors.ancestors.at(-1) !== undefined) {
        const parentOp = unionWAncestors.ancestors.pop()!.value;

        if (QueryTree.isOneOfTypes(parentOp, BINARY_OPS_TYPES_ANY_DISTR_TYPES)) {
            unionOp = rewriteUnionToAboveBinaryOrMoreOp(parentOp, unionOp);
        } else if (QueryTree.isOneOfTypes(parentOp, UNARY_OPERATOR_TYPES)) {
            unionOp = rewriteUnionToAboveUnaryOp(parentOp, unionOp);
        } else {
            unionOp = mergeUnions(parentOp, unionOp);
        }
    }
    return unionOp;
}

// Unary parent operators that preserves the union operator
export const UNARY_OPERATOR_TYPES = [QueryTree.types.PROJECT, QueryTree.types.FILTER] as const;
// Binary parent operators that are distributive over the union operator
export const BINARY_OPS_DISTR_TYPES = [QueryTree.types.JOIN] as const;
// Non-commutative binary parent operators that are left-distributive over the union operator
export const BINARY_OPS_LEFT_DISTR_TYPES = [QueryTree.types.LEFT_JOIN, QueryTree.types.MINUS] as const;
// Binary parent operators that are at least left- or right-distributive over the union operator
export const BINARY_OPS_TYPES_ANY_DISTR_TYPES = [...BINARY_OPS_DISTR_TYPES, ...BINARY_OPS_LEFT_DISTR_TYPES] as const;

function mergeUnions(parent: QueryTree.Union, child: QueryTree.Union): QueryTree.Union {
    // Associative property of the union operator
    const childIdx = parent.input.indexOf(child);
    assert(childIdx !== -1);
    parent.input.splice(childIdx, 1, ...child.input); // Replace the child with its inputs
    return parent;
}

class BadNodeError extends Error {
    constructor(public readonly badNodeIdx: number) {
        super();
    }
}
