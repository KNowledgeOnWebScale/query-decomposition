import { translate, toSparql } from "sparqlalgebrajs";

const q = `
PREFIX dc:   <http://purl.org/dc/elements/1.1/> 
PREFIX :     <http://example.org/book/> 
PREFIX ns:   <http://example.org/ns#> 

SELECT ?book ?title ?price
{
   VALUES ?book { :book1 :book3 }
   ?book dc:title ?title ;
         ns:price ?price .
}`;
//const x = translate(q);
const x = translate(q);

//console.log(toSparql(x.input.expression) == "")
//console.debug(JSON.stringify(x, null, 2));
console.log(JSON.stringify(x, null, 2));
console.log(toSparql(x, { explicitDatatype: true }));
// console.log(toSparql(x));
