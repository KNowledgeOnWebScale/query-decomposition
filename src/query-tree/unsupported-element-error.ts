import type { Algebra } from "sparqlalgebrajs";

export class UnsupportedAlgebraElement extends Error {
    constructor(public readonly op: Algebra.Operation) {
        super(`Unsupported SPARQL Algebra element type '${op.type}' found`);
    }
}
