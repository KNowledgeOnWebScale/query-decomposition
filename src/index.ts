import { strict as assert } from "assert";

import { translate, Algebra } from "sparqlalgebrajs";

import { prettyPrintJSON } from "./utils.js";

const q = `
PREFIX : <http://example.com/ns#>

SELECT * WHERE {
    ?s :labelA ?label MINUS
    { {?s :labelB ?labelB} UNION {?s :labelC ?labelC} }
}`;
const tq = translate(q, { quads: false });

assert(tq.type === Algebra.types.PROJECT);

prettyPrintJSON(tq);
// const op = moveUnionsToTop(tq);
// console.log(toSparql(op));

// if (op !== null) {
//   prettyPrintJSON(op);
// } else {
//   console.log("Op not found!")
// }
//console.log(tq);
//prettyPrintJSON(tq);
