// const q = `
// PREFIX :     <http://example.org/>

// SELECT ?e WHERE {
//     :alice :knows ?y .
//     {
//       SELECT ?y (MIN(?name) AS ?minName)
//       WHERE {
//           ?y :name ?name .
//       } ORDER BY ?y
//     }
// }`;
const q = `
 PREFIX ex:     <http://example.org/>
 PREFIX rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 
select ?x  ?y where {
  {?x rdf:type ex:someType}        
  {?x ex:someProperty ?y}
}`;
