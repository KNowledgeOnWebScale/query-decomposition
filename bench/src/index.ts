import * as path from "node:path";
import { getQueries } from "./queries.js";
import { PROJECT_DIR } from "./utils.js";
import {strict as assert} from "node:assert"

import { maximallyDecomposeQueryTree, Algebra } from "move-sparql-unions-to-top"
import { executeQuery } from "./execute-query.js";


const QUERY_TEMPLATES_DIR = path.join(PROJECT_DIR, "./query-templates");
const QUERY_SUBSTITUTIONS_DIR = path.join(PROJECT_DIR, "./substitution_parameters");

const queries = await getQueries(QUERY_TEMPLATES_DIR, QUERY_SUBSTITUTIONS_DIR);

const materializedQueries: [Algebra.Project, Awaited<ReturnType<typeof executeQuery>>[]][] = [];

for (const query of queries) {
    const queryRoot = Algebra.translate(query);
    assert(queryRoot.type === Algebra.types.PROJECT);

    const subqueries = maximallyDecomposeQueryTree(queryRoot);

    const subqueriesResults = await Promise.all(
        subqueries.map(subquery => {
            const q = materializedQueries.find(([queryRoot,]) => Algebra.areEquivalent(queryRoot, subquery));

            if (q !== undefined) {
                // hitCount + 1 or cached size + q[1].size ?? 
            }
    
            return q !== undefined ? Promise.resolve(q[1]) : executeQuery(Algebra.toSparql(subquery) + "\nLIMIT 2").then(x => [x]);
        })
    );

    materializedQueries.push([
        queryRoot,
        subqueriesResults.flat()
    ]);

    // console.log("EXECUTING", subqueries);
    // const q = `
    //     SELECT ?personId ?p2 WHERE {
    //     ?rootPerson <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Person>;
    //       <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/id> ?personId.
    //     }
    //     LIMIT 2
    // `

    //console.log((await executeQuery(subqueries[0]!)).map(bind => bind.toString()));
}