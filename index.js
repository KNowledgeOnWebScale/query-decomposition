import { translate, toSparql } from "sparqlalgebrajs";

const q = `
    PREFIX : <http://example.com/ns#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX sn: <http://www.ldbc.eu/ldbc_socialnet/1.0/data/>
    PREFIX snvoc: <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
    PREFIX sntag: <http://www.ldbc.eu/ldbc_socialnet/1.0/tag/>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX dbpedia: <http://dbpedia.org/resource/>
    PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>

        SELECT *
        WHERE
        {
            {
                ?message a snvoc:Comment .
            } UNION {
                ?message a snvoc:Post .
            } .
            ?message snvoc:length ?length .
            ?message snvoc:creationDate ?creationDate .

            FILTER (?creationDate < $date) .
        }`;
//const x = translate(q);
const x = translate(q);

//console.log(toSparql(x.input.expression) == "")
//console.debug(JSON.stringify(x, null, 2));
console.log(JSON.stringify(x, null, 2));
// console.log(toSparql(x));
