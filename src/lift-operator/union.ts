import { strict as assert } from "assert";

import createDebug from "debug";

import { name as packageName } from "../../package.json";
import { Algebra } from "../query-tree/index.js";
import { toSparql } from "../query-tree/translate.js";
import { findFirstOpOfTypeNotRoot, type QueryNodeWithAncestors } from "../query-tree/traverse.js";

import { liftSeqOfBinaryAboveBinary, liftSeqOfBinaryAboveUnary } from "./lift.js";
import { replaceChild } from "./utils.js";

const debug = createDebug(`${packageName}:move-unions-to-top`);

export function moveUnionsToTop(query: Algebra.Project): Algebra.Project {
    let unionOp = findFirstOpOfTypeNotRoot(Algebra.types.UNION, query);
    if (unionOp === null) {
        return query; // No unions to move
    }

    assert(!unionOp.ancestors.isEmpty()); // Invariant: the top level projection must be above the union

    const origQuery = structuredClone(query);

    let newQuery: Algebra.Operation;
    const skipUnions = new Set<Algebra.Union>(); // Unions that cannot be moved all the way up
    do {
        const newQuery_ = moveUnionToTop(unionOp);
        if (newQuery_ !== null) {
            newQuery = newQuery_;
        } else {
            skipUnions.add(unionOp.value.value);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            newQuery = unionOp.ancestors.peekFront()!.value;
        }
        debug(
            toSparql({
                type: Algebra.types.PROJECT,
                variables: query.variables,
                input: newQuery,
            }),
        );
        unionOp = findFirstOpOfTypeNotRoot(Algebra.types.UNION, newQuery, skipUnions); // Invariant: the top level union operation is always above!
        assert(unionOp === null || !unionOp.ancestors.isEmpty()); // Invariant: the top level projection must be above the union
    } while (unionOp !== null);

    if (newQuery.type !== Algebra.types.PROJECT) {
        // Union operator was moved above the final projection operation
        newQuery = {
            type: Algebra.types.PROJECT,
            variables: origQuery.variables,
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

export function moveUnionToTop(unionOp: QueryNodeWithAncestors<Algebra.Union>): Algebra.Union | null {
    assert(!unionOp.ancestors.isEmpty());

    // Check if union operator occurs in left-hand side operand of operator type present in `BINARY_OPS_LEFT_DISTR_TYPES`
    for (let i = 0; i < unionOp.ancestors.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const parentOp = unionOp.ancestors.peekAt(i)!;
        if (Algebra.isOneOfOpTypes(parentOp.value, BINARY_OPS_LEFT_DISTR_TYPES) && parentOp.parentIdx === 1) {
            // Cannot move union operator all the way to the top, so do not move it at all!
            return null;
        }
    }

    let unionOp__ = unionOp.value.value;
    while (true) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const parentOp = unionOp.ancestors.pop()!.value;

        let newOp: Algebra.Union;
        if (Algebra.isOneOfOpTypes(parentOp, BINARY_OPS_TYPES_ANY_DISTR_TYPES)) {
            newOp = liftSeqOfBinaryAboveBinary(parentOp, unionOp__);
        } else if (Algebra.isOneOfOpTypes(parentOp, UNARY_OPERATOR_TYPES)) {
            newOp = liftSeqOfBinaryAboveUnary(parentOp, unionOp__);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            assert(parentOp.type === Algebra.types.UNION);
            // Associative property of the union operator
            const childIdx = parentOp.input.indexOf(unionOp__);
            assert(childIdx !== -1);
            parentOp.input.splice(childIdx, 1, ...unionOp__.input); // Replace the child with its inputs
            newOp = parentOp;
        }

        const parentParent = unionOp.ancestors.peekBack();
        if (parentParent !== undefined) {
            replaceChild(parentParent.value, parentOp, newOp);
            // eslint-disable-next-line no-param-reassign
            unionOp__ = newOp;
        } else {
            return newOp;
        }
    }
}
