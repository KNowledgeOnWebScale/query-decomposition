import type { Algebra } from "sparqlalgebrajs";

export class UnsupportedSPARQLOpError extends Error {
    constructor(op: Algebra.Operation) {
        super(`Unsupported SPARQL Algebra operation type '${op.type}' found: ${JSON.stringify(op)}`);
    }
}
