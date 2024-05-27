import path from "node:path";

import { executeQuery } from "../src/execute-query.js";
import { type BenchmarkName } from "../src/index.js";
import { getQueryStringsFromTemplates } from "../src/query-strings/get-query-strings.js";
import { PROJECT_DIR } from "../src/utils.js";

const BENCH_NAME: BenchmarkName = "ldbc";
const queries = new Map(
    (
        await getQueryStringsFromTemplates(
            path.join(PROJECT_DIR, "data_sources", BENCH_NAME, "query_templates"),
            path.join(PROJECT_DIR, "data_sources", BENCH_NAME, "query_substitution_parameters"),
        )
    ).map(x => [x.name, x.queries]),
);

const QUERY_NAME = "interactive-short-3";
const res: { csvLineNumber: number; resultCount: number }[] = [];
for (const [i, q] of queries.get(QUERY_NAME)!.entries()) {
    res.push({ csvLineNumber: i + 2, resultCount: (await executeQuery(q))[0].length });
}
res.sort((a, b) => b.resultCount - a.resultCount);
console.log(res);
