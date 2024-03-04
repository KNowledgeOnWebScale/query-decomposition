import { translate, toSparql } from 'sparqlalgebrajs';

const q = `
PREFIX : <http://x>
 
SELECT * WHERE {
    {
        {?s ?p ?o} UNION {?s ?p ?o2}
    } UNION {
        {?s ?p ?o} UNION {?s ?p ?o3}
    }
}`;
const x = translate(q, { quads: false });

console.debug(JSON.stringify(x, null, 2));
console.log(toSparql(x));