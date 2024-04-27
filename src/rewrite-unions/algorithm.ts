import { strict as assert } from "assert";

import createDebug from "debug";

import { PACKAGE_NAME } from "../constants.js";
import { Algebra } from "../query-tree/index.js";
import { SetC } from "../utils.js";

import { rewriteUnionToAboveBinaryOrMoreOp, rewriteUnionToAboveUnaryOp } from "./rules.js";

const debug = createDebug(`${PACKAGE_NAME}:move-unions-to-top`);

export function moveUnionsToTop(query: Algebra.Project): Algebra.Project {
    let newQuery: Algebra.Operation = query;

    const ignoredUnions = new SetC<Algebra.Union>(); // Unions that cannot be moved all the way up
    const ignoredSubtrees = new SetC<Algebra.Operation>();
    let traversalState: Algebra.TraversalState | undefined = undefined;
    while (true) {
        const traversalResult: ReturnType<typeof Algebra.findFirstOpOfType<Algebra.types.UNION>> =
            Algebra.findFirstOpOfType(Algebra.types.UNION, newQuery, ignoredSubtrees, ignoredUnions, traversalState);
        if (traversalResult === null) {
            break; // No (more) unions to move
        }
        const unionOpWAncestors = traversalResult[0];
        traversalState = traversalResult[1];
        assert(unionOpWAncestors.ancestors.length !== 0 && unionOpWAncestors.value.parentIdx !== null); // Invariant: union is not top-level

        try {
            newQuery = moveUnionToTop(unionOpWAncestors);
            ignoredUnions.add(newQuery); // Skip top-level unions
            traversalState = undefined; // Tree has changed
            debug(
                Algebra.toSparql({
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
            traversalState!.path.length = err.newTraversalStateLength;
            traversalState!.pathNextChildToVisitIdx.length = err.newTraversalStateLength;
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

export function moveUnionToTop(unionOpWAncestors: Algebra.QueryNodeWithAncestors<Algebra.Union>): Algebra.Union {
    // Check if union operation occurs in right-hand side operand of an operator present in `BINARY_OPS_LEFT_DISTR_TYPES`
    const check = unionOpWAncestors.ancestors.slice();
    check.push(unionOpWAncestors.value);
    for (let i = 0; i < check.length - 1; i++) {
        const parent = check[i]!;
        const v = check[i + 1]!;
        if (Algebra.isOneOfTypes(parent.value, BINARY_OPS_LEFT_DISTR_TYPES) && v.parentIdx === 1) {
            throw new BadNodeError(parent.value, i);
        }
    }

    let unionOp = unionOpWAncestors.value.value;
    while (true) {
        const parentOp = unionOpWAncestors.ancestors.pop()!.value;

        let newOp: Algebra.Union;
        if (Algebra.isOneOfTypes(parentOp, BINARY_OPS_TYPES_ANY_DISTR_TYPES)) {
            newOp = rewriteUnionToAboveBinaryOrMoreOp(parentOp, unionOp);
        } else if (Algebra.isOneOfTypes(parentOp, UNARY_OPERATOR_TYPES)) {
            newOp = rewriteUnionToAboveUnaryOp(parentOp, unionOp);
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
        if (parentParent === undefined) {
            return newOp;
        }
        unionOp = newOp;
    }
}

class BadNodeError extends Error {
    constructor(
        public readonly node: Algebra.Minus | Algebra.LeftJoin,
        public readonly newTraversalStateLength: number,
    ) {
        super();
    }
}
