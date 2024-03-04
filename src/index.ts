import { strict as assert } from "assert";

import { translate, Algebra, toSparql } from "sparqlalgebrajs";

import { moveUnionsToTop } from "./lift-operator/union.js";
import { findFirstOpOfTypeNotRoot } from "./t.js";
import { prettyPrintJSON } from "./utils.js";

const q = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX :     <http://example.com>

SELECT ?page ?type ?name WHERE
{
  { ?s rdfs:label "Apple"@en }
  UNION
  { ?s rdfs:label "Alphabet"@en }
}`;
const tq = translate(q, { quads: false });

assert(tq.type == Algebra.types.PROJECT);

//prettyPrintJSON(tq)
const op = moveUnionsToTop(tq);
console.log(toSparql(op));

// if (op !== null) {
//   prettyPrintJSON(op);
// } else {
//   console.log("Op not found!")
// }
//console.log(tq);
//prettyPrintJSON(tq);
