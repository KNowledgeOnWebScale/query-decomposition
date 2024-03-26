import { strict as assert } from "assert";

import { Algebra } from "./query-tree/index.js";
import { toSparql, translate } from "./query-tree/translate.js";
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
        SELECT * WHERE {
            ?s :label1 ?label1.
            { ?s :label2 ?label2 . FILTER(strlen(?label2) > 0) }
            ?s :labelA ?label
        }
    }
    UNION
    {
        SELECT * WHERE {
            ?s :label1 ?label1.
            { ?s :label2 ?label2 . FILTER(strlen(?label2) > 0) }
            ?s :labelB ?label
        }
    }
}`;
const tq3 = translate(q2);
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
