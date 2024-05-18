import { strict as assert } from "node:assert";
import * as path from "node:path";

import { executeQuery } from "./execute-query.js";
import { getQueryStrings } from "./query-strings/get-query-strings.js";
import { DQMaterialization } from "./query-materialization/decomposed-query.js";
import { FQMaterialization } from "./query-materialization/full-query.js";
import { areEqualTerms, PROJECT_DIR, sortOnHash } from "./utils.js";

import hash from "object-hash"
import { DQMTimingK, FQMTimingK, TotalTimingK, type DQMTimings, type FQMTimings } from "./timings.js";
import { exit } from "node:process";
import { getQueryStringScenarios as createQueryStringScenarios } from "./create-query-scenarios/index.js";
import type { Bindings } from "@rdfjs/types";
import { areUnorderedEqual } from "move-sparql-unions-to-top/tests/utils/index.js";
import { mergeLogs } from "./merge-logs.js";
import * as RDF from '@rdfjs/types';

import fs from "node:fs/promises"
import { areEquivalent } from "./query-tree/equivalence.js";
import { toSparql } from "sparqlalgebrajs";

//const queryStrings = await getQueryStrings(QUERY_TEMPLATES_DIR, QUERY_SUBSTITUTIONS_DIR);
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

export type ScenariosLog = {
    avgs: { fq: Log, cfq: Log, changeOne: Log, onlyOne: Log },
    stdDev: { fq: Log, cfq: Log, changeOne: Log, onlyOne: Log },
}


//const QUERY_TEMPLATES_DIR = path.join(PROJECT_DIR, "./query-templates");
//const QUERY_SUBSTITUTIONS_DIR = path.join(PROJECT_DIR, "./substitution_parameters");

const QUERIES_DIR = "benchs/sp2b/sp2b/queries"
const BENCH_NAME = "sp2b"

main()

async function main() {
    const STABLE_COUNT = 10;
    
    let queryStrings = await getQueryStrings(path.join(PROJECT_DIR, QUERIES_DIR));
    const queryStrings2 = [queryStrings[0]![1]!]

    let fQMaterialization = new FQMaterialization();
    let dQMaterialization = new DQMaterialization();

    //console.log(queryStrings2[0])
    const qLogs: ScenariosLog[] = [];
    for (const queryS of queryStrings2) {
        const preWarmupFQMFullQueryState = structuredClone(fQMaterialization.mViews);
        const preWarmupDQMFullQueryState = structuredClone(dQMaterialization.mViews);
        await runQueryScenarios(queryS, fQMaterialization, dQMaterialization, {stableCount: 1}) // Warmup
        fQMaterialization.mViews = preWarmupFQMFullQueryState;
        dQMaterialization.mViews = preWarmupDQMFullQueryState;

        console.log(String("==").repeat(40) + "WARMUP END" + String("==").repeat(40))

        const qlog = await runQueryScenarios(queryS, fQMaterialization, dQMaterialization, {stableCount: STABLE_COUNT});
        
        console.log(JSON.stringify(qlog, null, 2));
        qLogs.push(qlog)   
    
        console.log("=".repeat(100));
    }

    fs.writeFile(path.join(PROJECT_DIR, "results", `${BENCH_NAME}.json`), JSON.stringify(qLogs, null, 2))
}

async function runQueryScenarios(queryS: string, fQMaterialization: FQMaterialization, dQMaterialization: DQMaterialization, opts: {stableCount: number}): Promise<ScenariosLog> {
    let qLog = {
        avgs: { fq: {}, cfq: {}, changeOne: {}, onlyOne: {} },
        stdDev: { fq: {}, cfq: {}, changeOne: {}, onlyOne: {} },
    }

    const {changeOne: changeOneQuerySs, onlyOne: onlyOneQuerySs} = createQueryStringScenarios(queryS);

    let tLogs: Log[] = []
    for (let i = 0; i < opts.stableCount; i++) {
        fQMaterialization.mViews = [];
        dQMaterialization.mViews = [];
        tLogs.push(await runQuery(queryS, fQMaterialization, dQMaterialization));
    }
    ({avgs: qLog.avgs.fq, stdDevs: qLog.stdDev.fq} = mergeLogs(tLogs));
    tLogs = []
    console.log(String("--").repeat(80))


    const fQMFullQueryState = structuredClone(fQMaterialization.mViews);
    const dQMFullQueryState = structuredClone(dQMaterialization.mViews);

    for (let i = 0; i < opts.stableCount; i++) {
        fQMaterialization.mViews = structuredClone(fQMFullQueryState);
        dQMaterialization.mViews = structuredClone(dQMFullQueryState);
        tLogs.push(await runQuery(queryS, fQMaterialization, dQMaterialization));
    }
    ({avgs: qLog.avgs.cfq, stdDevs: qLog.stdDev.cfq} = mergeLogs(tLogs));
    tLogs = []
    console.log(String("--").repeat(80))

    for (const changeOneQueryS of changeOneQuerySs) {
        for (let i = 0; i < opts.stableCount; i++) {
            fQMaterialization.mViews = structuredClone(fQMFullQueryState);
            dQMaterialization.mViews = structuredClone(dQMFullQueryState);
            tLogs.push(await runQuery(changeOneQueryS, fQMaterialization, dQMaterialization));
        }
    }
    ({avgs: qLog.avgs.changeOne, stdDevs: qLog.stdDev.changeOne} = mergeLogs(tLogs));
    tLogs = []
    console.log(String("--").repeat(80))

    for (const onlyOneQueryS of onlyOneQuerySs) {
        for (let i = 0; i < opts.stableCount; i++) {
            fQMaterialization.mViews = structuredClone(fQMFullQueryState);
            dQMaterialization.mViews = structuredClone(dQMFullQueryState);
            tLogs.push(await runQuery(onlyOneQueryS, fQMaterialization, dQMaterialization));
        }
    }
    ({avgs: qLog.avgs.onlyOne, stdDevs: qLog.stdDev.onlyOne} = mergeLogs(tLogs));
    tLogs = []

    return qLog as ScenariosLog;
}

async function runQuery(queryS: string, fQMaterialization: FQMaterialization, dQMaterialization: DQMaterialization): Promise<Log> {
    // const start = performance.now();
    // await executeQuery(queryS);
    // const end = performance.now();
    // console.log(`Time taken to warmup (naively compute answer to query once): ${end - start} ms`);

    const log: LogRaw = { fQMaterialization: {}, dQMaterialization: {} };

    let fQMAnswer: Bindings[];
    {
        [fQMAnswer, log.fQMaterialization.timings] = await fQMaterialization.answerQuery(queryS);
    
        const viewSize = fQMaterialization.roughSizeOfMaterializedViews();
        const total = viewSize.queries + viewSize.answers;
        log.fQMaterialization.mViewSize = {
            queries: { bytes: viewSize.queries, pct: viewSize.queries / total },
            answers: { bytes: viewSize.answers, pct: viewSize.answers / total },
        };
    }

    let dQMAnswer: Bindings[];
    {
        [dQMAnswer, log.dQMaterialization.timings] = await dQMaterialization.answerQuery(queryS);
    
        const viewSize = dQMaterialization.roughSizeOfMaterializedViews();
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

    assert(areUnorderedEqual(fQMAnswer, dQMAnswer, (x, y) => {
        // After a `structuredClone` only plain objects are left...
        const a = (x as any).entries._root.entries as [string, RDF.Term][];
        const b = (y as any).entries._root.entries as [string, RDF.Term][];
        return areUnorderedEqual(a, b, (c, d) => c[0] === d[0] && areEqualTerms(c[1], d[1]))
    }))

    return log as Log;
}
