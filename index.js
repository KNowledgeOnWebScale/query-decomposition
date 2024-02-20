import { translate, Algebra } from 'sparqlalgebrajs';


// const q = `
// PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
// PREFIX foaf: <http://xmlns.com/foaf/0.1/>

// SELECT ?page ?type WHERE
// {
//     ?s foaf:page ?page .
//     FILTER (?s > 0)
// }`;
// // src: https://stackoverflow.com/questions/10796978/union-of-two-selects-in-a-sparql-query

const q = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?x ?y WHERE
{
    {
    SELECT ?x ?y WHERE {
        ?x foaf:page ?page
    }
}UNION {
    SELECT ?x ?y WHERE {
        ?y foaf:page ?page2
    }
}
}`;
// src: https://stackoverflow.com/questions/10796978/union-of-two-selects-in-a-sparql-query

const inp = translate(q, { quads: false }).input;
console.debug(JSON.stringify(inp, null, 2));
console.log(typeof (inp));
//console.log(Algebra.types);