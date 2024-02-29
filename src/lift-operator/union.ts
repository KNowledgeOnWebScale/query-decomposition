import { Algebra } from "sparqlalgebrajs";
import { Node, findFirstOpOfType } from "../t.js";
import { strict as assert } from 'assert';
import { liftBinaryAboveBinary, liftBinaryAboveUnary } from "./lift.js";


export function moveUnionsToTop(query: Algebra.Project): Algebra.Project {
    const op = findFirstOpOfType<Algebra.Union>(Algebra.types.UNION, query);

    if (op === null) {
        return query; // No Unions to move
    }

    assert(op.parent !== undefined); // Only the root Project node has no parent

    while (op.parent !== undefined) {
        switch (op.parent.value.type) {
            case Algebra.types.PROJECT: case Algebra.types.FILTER: {
                liftBinaryAboveUnary(op.parent.value, op.value);

                break;
            }
            case Algebra.types.JOIN: {
                liftBinaryAboveBinary(op.parent.value, op.value);

                break;
            }
            default: {
                assert(false, `Unhandled SPARQL Algebra type: ${op.parent.value.type}`)
            }
        }
        op.parent = op.parent.parent
    }

    return {
        type: Algebra.types.PROJECT,
        variables: query.variables,
        input: op.value,
    };
}