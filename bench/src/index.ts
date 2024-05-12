import * as path from "node:path";
import { exit } from "node:process";

import { executeQuery } from "./execute-query.js";
import { getQueryStrings } from "./get-query-strings.js";
import { QueryMaterialization } from "./materialization.js";
import { NaiveQueryMaterialization } from "./naive-materialization.js";
import { PROJECT_DIR } from "./utils.js";


const QUERY_TEMPLATES_DIR = path.join(PROJECT_DIR, "./query-templates");
const QUERY_SUBSTITUTIONS_DIR = path.join(PROJECT_DIR, "./substitution_parameters");

const queryStrings = await getQueryStrings(QUERY_TEMPLATES_DIR, QUERY_SUBSTITUTIONS_DIR);
// //console.log((await executeQuery(queries[0]!)).map(x => x.toString()))
// console.log(queries)
// exit(1);

//queries.length = 1

const queryMaterialization = new QueryMaterialization();
const naiveQueryMaterialization = new NaiveQueryMaterialization();

if (queryStrings.length === 0) {
    exit(0);
}

const PADDING = 30;

console.log("=".repeat(100))
for (const queryS of queryStrings) {
    const start = performance.now();
    await executeQuery(queryS);
    const end = performance.now();
    console.log(`Time taken to warmup (naively compute answer to query once): ${end - start} ms`)

    printSeparator()
    console.log("Naive materialization")
    console.group()

    await naiveQueryMaterialization.answerQuery(queryS);
    
    const naiveMViewSize = naiveQueryMaterialization.roughSizeOfMaterializedViews()
    console.log("Rough size of naive materialization views:")
    console.group()
    console.log("Bytes:".padEnd(PADDING), naiveMViewSize)
    console.log("Ratio answers/query in %:".padEnd(PADDING), (naiveMViewSize.answers / naiveMViewSize.queries * 100).toFixed(3))
    console.groupEnd()

    console.groupEnd()

    printSeparator()
    console.log("Materialization")
    console.group()

    //await setTimeout(5000);

    await queryMaterialization.answerQuery(queryS);

    const mViewSize = queryMaterialization.roughSizeOfMaterializedViews()
    console.log("Rough size of materialization views:")
    console.group()
    console.log("Bytes:".padEnd(PADDING), mViewSize)
    console.log("Ratio answers/query in %:".padEnd(PADDING), (mViewSize.answers / mViewSize.queries * 100).toFixed(3))
    console.log("Ratio non-naive/naive in %:".padEnd(PADDING), {queries: `${(mViewSize.queries / naiveMViewSize.queries * 100).toFixed(3)} %`, answers: `${(mViewSize.answers / naiveMViewSize.answers * 100).toFixed(3)} %`})
    console.groupEnd()

    console.groupEnd()
    
    printSeparator()
}

function printSeparator() {
    console.log("=".repeat(100))
}

//console.log(materializedQueries)