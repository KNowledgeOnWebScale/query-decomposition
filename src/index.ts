import { strict as assert } from "assert";

import { translate } from "sparqlalgebrajs";

import { toSparql, translate as translateToInternalRepresentation } from "./tree/translate.js";
import { Algebra } from "./tree/types.js";
import { prettyPrintJSON } from "./utils.js";

// const q = `
// PREFIX : <http://example.com/ns#>

// SELECT * WHERE {
//     {?s :labelD ?labelD} UNION {?s :labelC ?labelC} UNION {?s :labelB ?labelB}
// }`;
// const tq = translate(q, { quads: false });

const q2 = `
PREFIX : <http://example.com/ns#>

SELECT * WHERE {
    {
        {?s :l1 ?l1}
        UNION 
        {?s :l3 ?l3}
        UNION
        {?s :l4 ?l4}
    }
}`;
const tq2 = translate(q2);
const tq3 = translateToInternalRepresentation(tq2);
assert(tq3.type === Algebra.types.PROJECT);

prettyPrintJSON(tq3);
console.log(toSparql(tq3));

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
