import { translate, toSparql } from "sparqlalgebrajs";

const q = `
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#> 
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX dc:   <http://purl.org/dc/elements/1.1/>

SELECT *
WHERE {
  ?erdoes rdf:type foaf:Person .
  ?erdoes foaf:name "Paul Erdoes".
}`;
//const x = translate(q);
const x = translate(q);

//console.log(toSparql(x.input.expression) == "")
//console.debug(JSON.stringify(x, null, 2));
console.log(JSON.stringify(x, null, 2));
console.log(toSparql(x, { explicitDatatype: true }));
// console.log(toSparql(x));
