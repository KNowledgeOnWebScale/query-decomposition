import { strict as assert } from "node:assert";
import * as path from "node:path";

import { executeQuery } from "./execute-query.js";
import { getQueryStrings } from "./query-strings/get-query-strings.js";
import { DQMaterialization } from "./query-materialization/decomposed-query.js";
import { FQMaterialization } from "./query-materialization/full-query.js";
import { calcAvg, calcAvgO, calcAvgON, PROJECT_DIR, sortOnHash } from "./utils.js";

import hash from "object-hash"
import { DQMTimingK, FQMTimingK, TotalTimingK, type DQMTimings, type FQMTimings } from "./timings.js";
import { exit } from "node:process";
import { getQueryStringScenarios } from "./create-query-scenarios/index.js";
import type { Bindings } from "@rdfjs/types";
import type { RequiredDeep } from "type-fest";
import { areUnorderedEqual } from "move-sparql-unions-to-top/tests/utils/index.js";
import { mergeLogs } from "./merge-logs.js";

const QUERY_TEMPLATES_DIR = path.join(PROJECT_DIR, "./query-templates");
const QUERY_SUBSTITUTIONS_DIR = path.join(PROJECT_DIR, "./substitution_parameters");

//const queryStrings = await getQueryStrings(QUERY_TEMPLATES_DIR, QUERY_SUBSTITUTIONS_DIR);
let queryStrings = await getQueryStrings(path.join(PROJECT_DIR, "benchs/sp2b/sp2b/queries"));
//console.log(await executeQuery(queryStrings[0]![1]!))
//console.log(queryStrings.length)
// const fq = queryStrings[0]![1]
// const changeOneBGPEach = getQueryStringScenarios(fq)
// console.log(changeOneBGPEach)

// //console.log((await executeQuery(queries[0]!)).map(x => x.toString()))
// console.log(queries)
// const t3 = (await (Promise.all(queryStrings.map(async (x, i) => [i, (await executeQuery(x[1])).length] as const)))).sort((a, b) => b[1]! - a[1]!)
// console.log(t3);
// for(let i = 0; i < queryStrings.length; i++) {
//     const a = 
//     console.log(i, a.length);
// }

//exit(1);

//queries.length = 1

type mViewSizeLog = {queries: {bytes: number, pct: number}, answers: {bytes: number, pct: number}}

const WARMUP_COUNT = 5;
type LogRaw = {
    fQMaterialization: { timings?: FQMTimings; mViewSize?: mViewSizeLog};
    dQMaterialization: { timings?: DQMTimings; mViewSize?: mViewSizeLog};
    dQMtoFQMViewSizePct?: {queries: number, answers: number, total: number}; 
}

export type Log = {
    fQMaterialization: { timings: FQMTimings; mViewSize: mViewSizeLog};
    dQMaterialization: { timings: DQMTimings; mViewSize: mViewSizeLog};
    dQMtoFQMViewSizePct: {queries: number, answers: number, total: number}; 
}

let queryMaterialization: DQMaterialization;
let naiveQueryMaterialization: FQMaterialization;

const queryStrings2 = [queryStrings[0]![1]!]
//console.log(queryStrings2[0])
for (const queryS of queryStrings2) {
    const logs: Log[] = []
    for (let i = 0; i < WARMUP_COUNT; i++) {
        queryMaterialization = new DQMaterialization();
        naiveQueryMaterialization = new FQMaterialization();
        logs.push(await collectLog(queryS));
    }

    const {avgs: logAvgs, stdDevs: logStdDevs} = mergeLogs(logs);
    
    console.log(JSON.stringify(logAvgs, null, 2));
    //console.log(JSON.stringify(logStdDevs, null, 2));


    console.log("=".repeat(100));
}

async function collectLog(queryS: string): Promise<Log> {
    const start = performance.now();
    await executeQuery(queryS);
    const end = performance.now();
    console.log(`Time taken to warmup (naively compute answer to query once): ${end - start} ms`);

    const log: LogRaw = { fQMaterialization: {}, dQMaterialization: {} };

    let fQMAnswer: Bindings[];
    {
        [fQMAnswer, log.fQMaterialization.timings] = await naiveQueryMaterialization.answerQuery(queryS);
    
        const viewSize = naiveQueryMaterialization.roughSizeOfMaterializedViews();
        const total = viewSize.queries + viewSize.answers;
        log.fQMaterialization.mViewSize = {
            queries: { bytes: viewSize.queries, pct: viewSize.queries / total },
            answers: { bytes: viewSize.answers, pct: viewSize.answers / total },
        };
    }

    let dQMAnswer: Bindings[];
    {
        [dQMAnswer, log.dQMaterialization.timings] = await queryMaterialization.answerQuery(queryS);
    
        const viewSize = queryMaterialization.roughSizeOfMaterializedViews();
        const total = viewSize.queries + viewSize.answers
        log.dQMaterialization.mViewSize = {
            queries: { bytes: viewSize.queries, pct: viewSize.queries / total },
            answers: { bytes: viewSize.answers, pct: viewSize.answers / total },
        };
    }

    log.dQMtoFQMViewSizePct = {
        queries: log.dQMaterialization.mViewSize.queries.bytes / log.fQMaterialization.mViewSize.queries.bytes, 
        answers: log.dQMaterialization.mViewSize.answers.bytes / log.dQMaterialization.mViewSize.answers.bytes, 
        total: (log.dQMaterialization.mViewSize.queries.bytes +  log.dQMaterialization.mViewSize.answers.bytes) / (log.fQMaterialization.mViewSize.queries.bytes + log.dQMaterialization.mViewSize.answers.bytes)
    } 

    assert(areUnorderedEqual(fQMAnswer, dQMAnswer, (x, y) => x.equals(y)))

    return log as Log;
}
