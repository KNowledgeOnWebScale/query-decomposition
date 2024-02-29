import { translate, Algebra, toSparql } from 'sparqlalgebrajs';


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

SELECT * WHERE
{
    {{SELECT * WHERE {  {?x foaf:page ?page} UNION {?x foaf:page2 ?page} }}
    UNION
    {SELECT * WHERE { ?y foaf:page ?page2 }}
    FILTER NOT EXISTS {?x foaf:page "hi"}
}
}`;
// src: https://stackoverflow.com/questions/10796978/union-of-two-selects-in-a-sparql-query

const inp = translate(q, { quads: false });
console.debug(JSON.stringify(inp, null, 2));
//console.log(toSparql(inp));
//console.log(typeof (inp));
//console.log(Algebra.types);