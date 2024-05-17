import { strict as assert } from "assert";

import createDebug from "debug";

import { PACKAGE_NAME } from "../constants.js";
import { QueryTree } from "../query-tree/index.js";
import { SetC } from "../utils.js";

import { rewriteUnionToAboveBinaryOrMoreOp, rewriteUnionToAboveUnaryOp } from "./rules.js";

const debug = createDebug(`${PACKAGE_NAME}:move-unions-to-top`);

export function rewriteUnionsToTop(query: QueryTree.Project): QueryTree.Project {
    let newQuery: QueryTree.Operation = query;

    const ignoredUnions = new SetC<QueryTree.Union>(); // Unions that cannot be moved all the way up
    const ignoredSubtrees = new SetC<QueryTree.Operation>();
    let traversalState: QueryTree.TraversalState | undefined = undefined;
    while (true) {
        const traversalResult: ReturnType<typeof QueryTree.findFirstOpOfType<QueryTree.types.UNION>> =
            QueryTree.findFirstOpOfType(
                QueryTree.types.UNION,
                newQuery,
                ignoredSubtrees,
                ignoredUnions,
                traversalState,
            );
        if (traversalResult === null) {
            break; // No (more) unions to move
        }
        const unionOpWAncestors = traversalResult[0];
        traversalState = traversalResult[1];
        assert(unionOpWAncestors.ancestors.length !== 0 && unionOpWAncestors.value.parentIdx !== null); // Invariant: union is not top-level

        try {
            newQuery = rewriteUnionToTop(unionOpWAncestors);
            ignoredUnions.add(newQuery); // Skip top-level unions
            traversalState = undefined; // Tree has changed
            debug(
                QueryTree.toSparql({
                    type: QueryTree.types.PROJECT,
                    variables: query.variables,
                    input: newQuery,
                }),
            );
        } catch (err) {
            assert(err instanceof BadNodeError);
            // Skip all nodes under the bad node, since we are in the RHS of a minus or left-join so no nodes can be moved from under it anymore (LHS could be but is already done)
            ignoredSubtrees.add(err.node);

            // Avoid a having to traverse up to this node again, only to skip it
            traversalState!.path.length = err.newTraversalStateLength;
            traversalState!.pathNextChildToVisitIdx.length = err.newTraversalStateLength;
        }
    }
    if (newQuery.type !== QueryTree.types.PROJECT) {
        // Union operator was moved above the final projection operator
        newQuery = {
            type: QueryTree.types.PROJECT,
            variables: query.variables,
            input: newQuery,
        };
    }

    return newQuery;
}

// Unary parent operators that preserves the union operator
const UNARY_OPERATOR_TYPES = [QueryTree.types.PROJECT, QueryTree.types.FILTER] as const;
// Binary parent operators that are distributive over the union operator
const BINARY_OPS_DISTR_TYPES = [QueryTree.types.JOIN] as const;
// Non-commutative binary parent operators that are left-distributive over the union operator
const BINARY_OPS_LEFT_DISTR_TYPES = [QueryTree.types.LEFT_JOIN, QueryTree.types.MINUS] as const;
// Binary parent operators that are at least left- or right-distributive over the union operator
const BINARY_OPS_TYPES_ANY_DISTR_TYPES = [...BINARY_OPS_DISTR_TYPES, ...BINARY_OPS_LEFT_DISTR_TYPES] as const;

export function rewriteUnionToTop(
    unionOpWAncestors: QueryTree.QueryNodeWithAncestors<QueryTree.Union>,
): QueryTree.Union {
    // Check if union operation occurs in right-hand side operand of an operator present in `BINARY_OPS_LEFT_DISTR_TYPES`
    const check = unionOpWAncestors.ancestors.slice();
    check.push(unionOpWAncestors.value);
    for (let i = 0; i < check.length - 1; i++) {
        const parent = check[i]!;
        const v = check[i + 1]!;
        if (QueryTree.isOneOfTypes(parent.value, BINARY_OPS_LEFT_DISTR_TYPES) && v.parentIdx === 1) {
            throw new BadNodeError(parent.value, i);
        }
    }

    let unionOp = unionOpWAncestors.value.value;
    while (true) {
        const parentOp = unionOpWAncestors.ancestors.pop()!.value;

        if (QueryTree.isOneOfTypes(parentOp, BINARY_OPS_TYPES_ANY_DISTR_TYPES)) {
            unionOp = rewriteUnionToAboveBinaryOrMoreOp(parentOp, unionOp);
        } else if (QueryTree.isOneOfTypes(parentOp, UNARY_OPERATOR_TYPES)) {
            unionOp = rewriteUnionToAboveUnaryOp(parentOp, unionOp);
        } else {
            unionOp = mergeUnions(parentOp, unionOp);
        }

        const parentParent = unionOpWAncestors.ancestors.at(-1);
        if (parentParent === undefined) {
            return unionOp;
        }
    }
}

function mergeUnions(parent: QueryTree.Union, child: QueryTree.Union): QueryTree.Union {
    // Associative property of the union operator
    const childIdx = parent.input.indexOf(child);
    assert(childIdx !== -1);
    parent.input.splice(childIdx, 1, ...child.input); // Replace the child with its inputs
    return parent;
}

class BadNodeError extends Error {
    constructor(
        public readonly node: QueryTree.Minus | QueryTree.LeftJoin,
        public readonly newTraversalStateLength: number,
    ) {
        super();
    }
}
