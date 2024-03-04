import { translate, toSparql } from 'sparqlalgebrajs';

const q = `
PREFIX : <http://x>
 
SELECT * WHERE {
    {
        { ?s :labelA ?pLabel }
        {{ ?s :labelC ?Label }
        UNION
        { ?s :labelD ?label }}
    }
    UNION
    {
        { ?s :labelB ?pLabel }
        {{ ?s :labelC ?Label }
        UNION
        { ?s :labelD ?label }}
    }
}`;
const x = translate(q, { quads: false });

console.debug(JSON.stringify(x, null, 2));
console.log(toSparql(x));