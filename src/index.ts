import { translate } from "sparqlalgebrajs";

import { areEqualOps } from "../tests/compare-queries.js";

const q = `
PREFIX : <http://example.com/ns#>

SELECT * WHERE {
    {?s :labelD ?labelD} UNION {?s :labelC ?labelC} UNION {?s :labelB ?labelB}
}`;
const tq = translate(q, { quads: false });

const q2 = `
PREFIX : <http://example.com/ns#>

SELECT * WHERE {
    {
        SELECT ?labelA ?labelB ?s WHERE { 
            { ?s :labelA ?labelA } MINUS { ?s :label ?label } 
        }
    }
    UNION
    {
        SELECT ?labelA ?labelB ?s WHERE {
            { ?s :labelB ?labelB } MINUS { ?s :label ?label }
        }
    }
}`;
const tq2 = translate(q2);

console.log(areEqualOps(tq, tq2));

// const op = moveUnionsToTop(tq);
// console.log(toSparql(op));

// if (op !== null) {
//   prettyPrintJSON(op);
// } else {
//   console.log("Op not found!")
// }
//console.log(tq);
//prettyPrintJSON(tq);
