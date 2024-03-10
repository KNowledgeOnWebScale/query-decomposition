import { strict as assert } from "assert";

import { Algebra } from "sparqlalgebrajs";

import { findFirstOpOfTypeNotRoot, type QueryNodeWithParent } from "../t.js";

import { liftSeqOfBinaryAboveBinary, liftSeqOfBinaryAboveUnary } from "./lift.js";
import { replaceChild } from "./utils.js";

export function moveUnionsToTop(query: Algebra.Project): Algebra.Project {
    const unionOp_ = findFirstOpOfTypeNotRoot<Algebra.Union>(Algebra.types.UNION, query);

    if (unionOp_ === null) {
        return query; // No unions to move
    }

    assert(unionOp_.parent !== null); // Unnecessary since the top level projection must be above the union
    let unionOp: QueryNodeWithParent<Algebra.Union> | null = unionOp_ as QueryNodeWithParent<Algebra.Union>;

    let newQuery: Algebra.Union;
    do {
        newQuery = moveUnionToTop(unionOp);
        //prettyPrintJSON(newQuery)
        // console.log(
        //     toSparql({
        //         type: Algebra.types.PROJECT,
        //         variables: query.variables,
        //         input: newQuery,
        //     }),
        // );
        const unionOp_ = findFirstOpOfTypeNotRoot<Algebra.Union>(Algebra.types.UNION, newQuery);
        if (unionOp_ !== null) {
            assert(unionOp_.parent !== null); // Unnecessary since the top level union operation is always above!
        }
        unionOp = unionOp_ as QueryNodeWithParent<Algebra.Union> | null;
        //console.log(unionOp)
    } while (unionOp !== null);

    return {
        type: Algebra.types.PROJECT,
        variables: query.variables,
        input: newQuery,
    };
}

export function moveUnionToTop(unionOp: QueryNodeWithParent<Algebra.Union>): Algebra.Union {
    while (true) {
        let newOp: Algebra.Union;
        switch (unionOp.parent.value.type) {
            case Algebra.types.PROJECT:
            case Algebra.types.FILTER: {
                newOp = liftSeqOfBinaryAboveUnary(unionOp.parent.value, unionOp.value);

                break;
            }
            case Algebra.types.JOIN: {
                newOp = liftSeqOfBinaryAboveBinary(unionOp.parent.value, unionOp.value);

                break;
            }
            case Algebra.types.UNION: {
                // Associative property of union
                const parent = unionOp.parent.value;
                const childIdx = parent.input.indexOf(unionOp.value);
                assert(childIdx !== -1);
                parent.input.splice(childIdx, 1, ...unionOp.value.input); // Replace the child with its inputs
                newOp = parent;

                break;
            }
            default: {
                assert(false, `Unhandled SPARQL Algebra type: ${unionOp.parent.value.type}`);
            }
        }
        const parentParent = unionOp.parent.parent; // Can't be a parent if it didn't take inputs
        if (parentParent !== null) {
            replaceChild(parentParent.value, unionOp.parent.value, newOp);
            // eslint-disable-next-line no-param-reassign
            unionOp = { value: newOp, parent: parentParent };
        } else {
            return newOp;
        }
    }
}
