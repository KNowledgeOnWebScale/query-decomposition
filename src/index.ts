import { strict as assert } from 'assert';

import { translate, Algebra, toSparql } from 'sparqlalgebrajs';
import { prettyPrintJSON } from "./utils.js"

const q = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?page ?type ?name WHERE
{
  ?s foaf:page ?page .
  { ?s rdfs:label "Microsoft"@en }
  UNION
  { ?s rdfs:label "Apple"@en }
  UNION
  { ?s rdfs:label "Alphabet"@en }
}`;

// src: https://stackoverflow.com/questions/10796978/union-of-two-selects-in-a-sparql-query

const tq = translate(q, { quads: false });

assert(tq.type == Algebra.types.PROJECT)

function findDeepestOp(op: Algebra.Operation): Algebra.Operation[] | null {
  if (!("input" in op)) {
    // Undecomposable expression
    assert(op.type == Algebra.types.BGP)
    return null;
  }

  if (op.type == Algebra.types.UNION) {
    // currently moving only the first union operation upto the top
    return op.input;
  }

  const subOp = op.input;
  if (Array.isArray(subOp)) {
    assert(subOp.length > 0)
    let newSubOps = null;
    for (const subSubExpr of subOp) {
      newSubOps = findDeepestOp(subSubExpr);
      if (newSubOps !== null) {
        break; // TODO: what if both clauses can be decomposed?
      }
    }
    if (newSubOps === null) {
      return null;
    }
    assert(subOp.length == 2) // only handle binary operations

    const undecompSubExprIdx = subOp[0].type == Algebra.types.UNION ? 1 : 0; // TODO better way...

    const newOps = []
    for (const newSubExpr of newSubOps) {
      const newOp = structuredClone(op);
      newOp.input = undecompSubExprIdx == 0 ? [subOp[0], newSubExpr] : [newSubExpr, subOp[1]];
      newOps.push(newOp);
    }
    return newOps;
  } else {
    const newSubOps = findDeepestOp(subOp);

    if (newSubOps === null) {
      assert(false);
      return null;
    }

    if (op.type === Algebra.types.PROJECT) {
      return newSubOps.map<Algebra.Project>(
        (newSubExpr) => {
          return {
            type: Algebra.types.PROJECT,
            variables: structuredClone(op.variables),
            input: newSubExpr,
          }
        }
      )
    } else {
      assert(false)
    }
  }
}

console.log(findDeepestOp(tq)?.map(expr => toSparql(expr)))
//prettyPrintJSON(tq);