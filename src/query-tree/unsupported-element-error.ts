import type { Algebra as ExternalAlgebra } from "sparqlalgebrajs";

export class UnsupportedAlgebraElement extends Error {
    constructor(public readonly op: ExternalAlgebra.Operation) {
        super(`Unsupported SPARQL Algebra element type '${op.type}' found`);
    }
}
