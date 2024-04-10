import { strict as assert } from "assert";

import createDebug from "debug";

import { name as packageName } from "../../package.json";
import { Algebra } from "../query-tree/index.js";
import { toSparql } from "../query-tree/translate.js";
import { findFirstOpOfType, type QueryNodeWithAncestors, type TraversalState } from "../query-tree/traverse.js";
import { SetC } from "../utils.js";

import { liftSeqOfBinaryAboveBinary, liftSeqOfBinaryAboveUnary } from "./lift.js";
import { replaceChild } from "./utils.js";

const debug = createDebug(`${packageName}:move-unions-to-top`);

export function moveUnionsToTop(query: Algebra.Project): Algebra.Project {
    let newQuery: Algebra.Operation = query;

    const ignoredUnions = new SetC<Algebra.Union>(); // Unions that cannot be moved all the way up
    const ignoredSubtrees = new SetC<Algebra.Operation>();
    let traversalState: TraversalState | undefined = undefined;
    while (true) {
        const traversalResult: ReturnType<typeof findFirstOpOfType<Algebra.types.UNION>> = findFirstOpOfType(
            Algebra.types.UNION,
            newQuery,
            ignoredSubtrees,
            ignoredUnions,
            traversalState,
        );
        if (traversalResult === null) {
            break; // No (more) unions to move
        }
        const unionOpWAncestors: (typeof traversalResult)[0] = traversalResult[0];
        traversalState = traversalResult[1];
        assert(unionOpWAncestors.ancestors.length !== 0 && unionOpWAncestors.value.parentIdx !== null); // Invariant: union is not top-level

        try {
            newQuery = moveUnionToTop(unionOpWAncestors);
            ignoredUnions.add(newQuery); // Skip top-level unions
            traversalState = undefined; // Tree has changed
            debug(
                toSparql({
                    type: Algebra.types.PROJECT,
                    variables: query.variables,
                    input: newQuery,
                }),
            );
        } catch (err) {
            assert(err instanceof BadNodeError);
            // Skip all nodes under the bad node, since we are in the RHS of a minus or left-join so no nodes can be moved from under it anymore (LHS could be but is already done)
            ignoredSubtrees.add(err.node);
            // Avoid a having to traverse up to this node again, only to skip it
            while (traversalState!.path.at(-1)?.value !== err.node) {
                traversalState!.path.pop();
                traversalState!.pathNextChildToVisitIdx.pop();
            }
            traversalState!.path.pop();
            traversalState!.pathNextChildToVisitIdx.pop();
        }
    }
    if (newQuery.type !== Algebra.types.PROJECT) {
        // Union operator was moved above the final projection operator
        newQuery = {
            type: Algebra.types.PROJECT,
            variables: query.variables,
            input: newQuery,
        };
    }

    return newQuery;
}

// Unary parent operators that preserves the union operator
const UNARY_OPERATOR_TYPES = [Algebra.types.PROJECT, Algebra.types.FILTER] as const;
// Binary parent operators that are distributive over the union operator
const BINARY_OPS_DISTR_TYPES = [Algebra.types.JOIN] as const;
// Non-commutative binary parent operators that are left-distributive over the union operator
const BINARY_OPS_LEFT_DISTR_TYPES = [Algebra.types.LEFT_JOIN, Algebra.types.MINUS] as const;
// Binary parent operators that are at least left- or right-distributive over the union operator
const BINARY_OPS_TYPES_ANY_DISTR_TYPES = [...BINARY_OPS_DISTR_TYPES, ...BINARY_OPS_LEFT_DISTR_TYPES] as const;

export function moveUnionToTop(unionOpWAncestors: QueryNodeWithAncestors<Algebra.Union>): Algebra.Union {
    // Check if union operation occurs in right-hand side operand of an operator present in `BINARY_OPS_LEFT_DISTR_TYPES`
    const check = unionOpWAncestors.ancestors.slice();
    check.push(unionOpWAncestors.value);
    for (let i = 0; i < check.length - 1; i++) {
        const a = check[i]!.value;
        if (Algebra.isOneOfOpTypes(a, BINARY_OPS_LEFT_DISTR_TYPES) && check[i + 1]!.parentIdx === 1) {
            // Cannot move union operator all the way to the top, so do not move it at all!
            throw new BadNodeError(a);
        }
    }

    let unionOp = unionOpWAncestors.value.value;
    while (true) {
        const parentOp = unionOpWAncestors.ancestors.pop()!.value;

        let newOp: Algebra.Union;
        if (Algebra.isOneOfOpTypes(parentOp, BINARY_OPS_TYPES_ANY_DISTR_TYPES)) {
            newOp = liftSeqOfBinaryAboveBinary(parentOp, unionOp);
        } else if (Algebra.isOneOfOpTypes(parentOp, UNARY_OPERATOR_TYPES)) {
            newOp = liftSeqOfBinaryAboveUnary(parentOp, unionOp);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            assert(parentOp.type === Algebra.types.UNION);
            // Associative property of the union operator
            const childIdx = parentOp.input.indexOf(unionOp);
            assert(childIdx !== -1);
            parentOp.input.splice(childIdx, 1, ...unionOp.input); // Replace the child with its inputs
            newOp = parentOp;
        }

        const parentParent = unionOpWAncestors.ancestors.at(-1);
        if (parentParent !== undefined) {
            replaceChild(parentParent.value, parentOp, newOp);
            // eslint-disable-next-line no-param-reassign
            unionOp = newOp;
        } else {
            return newOp;
        }
    }
}

export class BadNodeError extends Error {
    constructor(public readonly node: Algebra.Minus | Algebra.LeftJoin) {
        super();
    }
}
