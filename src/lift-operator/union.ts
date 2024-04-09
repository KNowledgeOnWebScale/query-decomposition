import { strict as assert } from "assert";

import createDebug from "debug";

import { name as packageName } from "../../package.json";
import { Algebra } from "../query-tree/index.js";
import { toSparql } from "../query-tree/translate.js";
import { findFirstOpOfType, type QueryNodeWithAncestors } from "../query-tree/traverse.js";

import { liftSeqOfBinaryAboveBinary, liftSeqOfBinaryAboveUnary } from "./lift.js";
import { replaceChild } from "./utils.js";

const debug = createDebug(`${packageName}:move-unions-to-top`);

export function moveUnionsToTop(query: Algebra.Project): Algebra.Project {
    let traverseResult = findFirstOpOfType(Algebra.types.UNION, query);
    if (traverseResult === null) {
        return query; // No unions to move
    }
    let unionOpWAncestors = traverseResult[0];
    let traversalState: (typeof traverseResult)[1] | undefined = traverseResult[1];
    assert(unionOpWAncestors.ancestors.length !== 0 && unionOpWAncestors.value.parentIdx !== null); // Invariant: the top level projection must be above the union

    let newQuery: Algebra.Operation;
    const skipUnions = new Set<Algebra.Union>(); // Unions that cannot be moved all the way up
    while (true) {
        try {
            const newQuery_ = moveUnionToTop(unionOpWAncestors);
            newQuery = newQuery_;
            skipUnions.add(newQuery_); // Skip top-level unions
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
            // Skip all nodes under the bad node
            while (traversalState!.path.pop()?.value !== err.node);

            skipUnions.add(unionOpWAncestors.value.value);
            newQuery = unionOpWAncestors.ancestors[0]!.value;
        }
        traverseResult = findFirstOpOfType(Algebra.types.UNION, newQuery, skipUnions, traversalState);
        if (traverseResult === null) {
            break;
        }
        [unionOpWAncestors, traversalState] = traverseResult;
        assert(unionOpWAncestors.ancestors.length !== 0 && unionOpWAncestors.value.parentIdx !== null); // Invariant: the top level union operator is always above
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
    // Check if union operator occurs in left-hand side operand of operator type present in `BINARY_OPS_LEFT_DISTR_TYPES`
    for (const ancestor of unionOpWAncestors.ancestors) {
        if (Algebra.isOneOfOpTypes(ancestor.value, BINARY_OPS_LEFT_DISTR_TYPES) && ancestor.parentIdx === 1) {
            // Cannot move union operator all the way to the top, so do not move it at all!
            throw new BadNodeError(ancestor.value);
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
