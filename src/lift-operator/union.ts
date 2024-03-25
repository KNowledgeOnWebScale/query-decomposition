import { strict as assert } from "assert";

import { Algebra } from "sparqlalgebrajs";

import { UnsupportedSPARQLOpError } from "../query-tree/unsupported-SPARQL-op-error.js";
import { findFirstOpOfTypeNotRoot2, hasParent, type QueryNode, type QueryNodeWithParent } from "../t.js";

import { liftSeqOfBinaryAboveBinary, liftSeqOfBinaryAboveUnary, type BinaryOp, type UnaryOp } from "./lift.js";
import { replaceChild, type OpWithInput } from "./utils.js";

export function moveUnionsToTop(query: Algebra.Project): Algebra.Project {
    const unionOp_ = findFirstOpOfTypeNotRoot2<Algebra.Union>(Algebra.types.UNION, query);

    if (unionOp_ === null) {
        return query; // No unions to move
    }

    const origQuery = structuredClone(query);

    assert(hasParent(unionOp_)); // Invariant: the top level projection must be above the union
    let unionOp: QueryNodeWithParent<Algebra.Union> | null = unionOp_;

    let newQuery: Algebra.Operation;
    const skipUnions = new Array<Algebra.Union>(); // Unions that cannot be moved all the way up
    do {
        try {
            const newQuery_ = moveUnionToTop(unionOp);
            if (newQuery_ === null) {
                skipUnions.push(unionOp.value);
                newQuery = getTopLevelOp(unionOp.parent.value);
            } else {
                newQuery = newQuery_;
            }
        } catch (err) {
            // Slow to 'fail' decomposition, but faster happy path since initial checks are avoided
            assert(
                err instanceof UnsupportedSPARQLOpError,
                `Unexpected error occurred during decomposition process: ${String(err)}`,
            );
            return origQuery;
        }
        // console.log(
        //     toSparql({
        //         type: Algebra.types.PROJECT,
        //         variables: query.variables,
        //         input: newQuery,
        //     }),
        // );
        const unionOp_ = findFirstOpOfTypeNotRoot2<Algebra.Union>(Algebra.types.UNION, newQuery, skipUnions);
        if (unionOp_ !== null) {
            assert(hasParent(unionOp_)); // Invariant: the top level union operation is always above!
        }
        unionOp = unionOp_;
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

export function moveUnionToTop(unionOp: QueryNodeWithParent<Algebra.Union>): Algebra.Union | null {
    {
        // Check if union operator occurs in left-hand side operand of operator type present in `BINARY_OPS_LEFT_DISTR_TYPES`
        let op: QueryNode<OpWithInput> = unionOp;
        while (op.parent !== null) {
            const parentOp = op.parent.value.value;
            if (BINARY_OPS_LEFT_DISTR_TYPES.includes(parentOp.type) && op.parent.childIdx === 1) {
                // Cannot move union operator all the way to the top, so do not move it at all!
                return null;
            }
            op = op.parent.value;
        }
    }

    while (true) {
        const parentOp = unionOp.parent.value.value;

        let newOp: Algebra.Union;
        if (UNARY_OPERATOR_TYPES.includes(parentOp.type)) {
            newOp = liftSeqOfBinaryAboveUnary(parentOp as UnaryOp, unionOp.value);
        } else if (BINARY_OPS_TYPES_ANY_DISTR_TYPES.includes(parentOp.type)) {
            newOp = liftSeqOfBinaryAboveBinary(parentOp as BinaryOp, unionOp.value);
        } else if (parentOp.type === Algebra.types.UNION) {
            // Associative property of the union operator
            const childIdx = parentOp.input.indexOf(unionOp.value);
            assert(childIdx !== -1);
            parentOp.input.splice(childIdx, 1, ...unionOp.value.input); // Replace the child with its inputs
            newOp = parentOp;
        } else {
            throw new UnsupportedSPARQLOpError(parentOp);
        }

        const parentParent = unionOp.parent.value.parent;
        if (parentParent !== null) {
            replaceChild(parentParent.value.value, parentOp, newOp);
            // eslint-disable-next-line no-param-reassign
            unionOp = { value: newOp, parent: parentParent };
        } else {
            return newOp;
        }
    }
}

function getTopLevelOp(startOp: QueryNode<Algebra.Operation>): Algebra.Operation {
    let op = startOp;
    while (op.parent !== null) {
        op = op.parent.value;
    }
    return op.value;
}

// function OpIsOneOf<T extends Algebra.Operation[], K extends Readonly<T[number]["type"][]>>(types: K, node: Algebra.Operation): node is T[number] {
//     return types.includes(node.type);
// }
