`
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
}`; // src: https://stackoverflow.com/questions/10796978/union-of-two-selects-in-a-sparql-query

// example of subselect
`
PREFIX :     <http://example.org/>

SELECT ?e WHERE {
    :alice :knows ?y .
    {
      SELECT ?y (MIN(?name) AS ?minName)
      WHERE {
          ?y :name ?name .
      } ORDER BY ?y
    }
}`;

// example of splitting a BGP
`
 PREFIX ex:     <http://example.org/>
 PREFIX rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 
select ?x  ?y where {
  {?x rdf:type ex:someType}        
  {?x ex:someProperty ?y}
}`;
