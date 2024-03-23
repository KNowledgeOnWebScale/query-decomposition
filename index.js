import { translate, toSparql } from "sparqlalgebrajs";

const q = `
PREFIX : <http://example.com/ns#>

SELECT * WHERE {
    {
        SELECT ?labelA ?labelB ?s WHERE { 
            { ?s :labelA ?labelA } MINUS { ?s :label ?label } 
        }
    }
    UNION
    {
        SELECT ?labelA ?labelB ?s WHERE {
            { ?s :labelB ?labelB } MINUS { ?s :label ?label }
        }
    }
}`;
const x = translate(q);

//console.log(toSparql(x.input.expression) == "")
console.debug(JSON.stringify(x, null, 2));
console.log(x.input);
// console.log(toSparql(x));
