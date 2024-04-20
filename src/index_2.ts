import { strict as assert } from "assert";

import { Algebra } from "./query-tree/index.js";
import { translate } from "./query-tree/translate.js";

// const q = `
// PREFIX : <http://example.com/ns#>

// SELECT * WHERE {
//     {?s :labelD ?labelD} UNION {?s :labelC ?labelC} UNION {?s :labelB ?labelB}
// }`;
// const tq = translate(q, { quads: false });

const q2 = `
PREFIX : <http://example.com/ns#>
SELECT * WHERE {
        { ?s :labelA ?label } UNION { ?s :labelB ?label }   
        FILTER(?a)
}`;
const tq3 = translate(q2);
assert(tq3.type === Algebra.types.PROJECT);

// Handle Algebra.types.NOP by returning nothing?

console.debug(JSON.stringify(tq3, null, 4));
// console.log(toSparql(tq3));

// const factory = new Factory();
// const counter = 0;
// const prefixIri = "x#"

// const t = <RDF.Variable>factory.createTerm("s")
// console.log(t);
// const ret = factory.createPattern(factory.createTerm("?s"), factory.createTerm(`${prefixIri}l${counter}`), factory.createTerm(`${prefixIri}o${counter}`))
// console.log(ret)

// assert(tq2.type == Algebra.types.PROJECT);
// const f = moveUnionsToTop(tq2);
// prettyPrintJSON(f);

// const op = moveUnionsToTop(tq);
// console.log(toSparql(op));

// if (op !== null) {
//   prettyPrintJSON(op);
// } else {
//   console.log("Op not found!")
// }
//console.log(tq);
//prettyPrintJSON(tq);
