import { strict as assert } from 'assert';

import { translate, Algebra } from 'sparqlalgebrajs';
import { prettyPrintJSON } from "./utils.js"

const q = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?page ?type WHERE
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

function findDeepestOp(expr: Algebra.Operation): Algebra.Operation[] | null {
    if (!("input" in expr)) {
        // undecomposable expression (BGP)
        return null;
    }

    if (expr.type == Algebra.types.UNION) {
        // currently moving only the first union operation upto the top
        return expr.input;
    }

    const subExpr = expr.input;
    if (Array.isArray(subExpr)) {
        let newSubExpr = [];
        for (const subSubExpr of subExpr) {
            const newSubSubExprs = findDeepestOp(subSubExpr);
            if (newSubSubExprs !== null) {
                assert(subExpr.length == 2) // only handle binary operations
                newSubExpr.push(...newSubSubExprs)
            } else {
                newSubExpr.push(subSubExpr)
            }
        }
        if (newSubExpr.length > subExpr.length) { // any decomposition results in more expressions!
            return newSubExpr;
        } else {
            return null;
        }
    } else {
        assert(false);
        const newExprs = findDeepestOp(subExpr);
        // console.log("HERE!")
        // if (newExprs !== null) {
        //   assert(subExpr.length == 2) // only handle binary operations
        //   let newParentExprs = []
        //   for (const newExpr of newExprs) {
        //     let newParentExpr = structuredClone(expr);
        //     newParentExpr.input = newExpr;
        //     newParentExprs.push(newParentExpr);
        //   }
        //   return newParentExprs; // TODO handle multiple
        // }
        // return null;
    }
}

prettyPrintJSON(findDeepestOp(tq.input))
//prettyPrintJSON(tq.input);
//console.log(exp.input);
//console.log(Algebra.types);