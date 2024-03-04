import { strict as assert } from 'assert';
import type { Algebra } from "sparqlalgebrajs";
import type { Multi, Single } from 'sparqlalgebrajs/lib/algebra.js';

export type WithOpInput = Single | Multi
export type OpWithInput = Algebra.Operation & WithOpInput


export function replaceChild(parent: WithOpInput, oldChild: Algebra.Operation, newChild: Algebra.Operation) {
    if (Array.isArray(parent.input)) {
        let childIdx = parent.input.indexOf(oldChild);
        assert(childIdx !== -1);
        parent.input[childIdx] = newChild
    } else {
        parent.input = newChild
    }
}