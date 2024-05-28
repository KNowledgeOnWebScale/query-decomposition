import { readdir } from "fs/promises";
import path from "node:path";

import { isDataSourceTemplated, type BenchmarkName } from "../src/index.js";
import { getQueryStringScenarios } from "../src/query-strings/create-query-scenarios.js";
import { getContentsOfFilesInDir, PROJECT_DIR } from "../src/utils.js";

let totalUnionOperandsCount = 0;
let totalQueryCount = 0;
for (const dataSourceName of (await readdir(path.join(PROJECT_DIR, "data_sources"), { withFileTypes: true }))
    .filter(dirEntry => dirEntry.isDirectory())
    .map(dirEntry => dirEntry.name)) {
    const queryStrings = await getContentsOfFilesInDir(
        path.join(
            PROJECT_DIR,
            "data_sources",
            dataSourceName,
            isDataSourceTemplated[dataSourceName as BenchmarkName] ? "query_templates" : "queries",
        ),
    );

    // Queries with an `_[a-z]` prefix originate from the same query
    const queries = new Map<string, string[]>();
    for (const queryS of queryStrings) {
        const queryName = path.basename(queryS[0], path.extname(queryS[0])).replace(/_[a-z]$/, "");

        if (queries.has(queryName)) {
            queries.get(queryName)!.push(queryS[1]);
        } else {
            queries.set(queryName, [queryS[1]]);
        }
    }

    totalQueryCount += queryStrings.length;

    const unionOperandsCount = Array.from(queries.values())
        .map(querySGrp => {
            return (
                querySGrp.map(qS => getQueryStringScenarios(qS).onlyOne.length).reduce((acc, e) => acc + e, 0) /
                querySGrp.length
            );
        })
        .reduce((acc, e) => acc + e, 0);
    totalUnionOperandsCount += unionOperandsCount;
}
const res = totalUnionOperandsCount / totalQueryCount;
console.log("Average union operands count: ", res.toFixed(2));

console.log("* 2 * 8 = ", (res * 2 * 8).toFixed(2));
