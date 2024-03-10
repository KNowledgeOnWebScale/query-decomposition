import { translate, toSparql } from "sparqlalgebrajs";

const q = `
PREFIX : <http://x>
     
PREFIX : <http://example.com/ns#>
    
SELECT * WHERE {
    ?s :label1 ?label1 .
    { ?s :label2 ?label2 . FILTER(strlen(?label2) > 0) }
    {{ ?s :labelA ?label } 
    UNION
    { ?s :labelB ?label }}
}`;
const x = translate(q, { quads: false });

console.debug(JSON.stringify(x, null, 2));
console.log(toSparql(x));
