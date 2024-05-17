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
import type { RequiredDeep } from "type-fest";
import { areUnorderedEqual } from "move-sparql-unions-to-top/tests/utils/index.js";
import { mergeLogs } from "./merge-logs.js";
import * as RDF from '@rdfjs/types';


const QUERY_TEMPLATES_DIR = path.join(PROJECT_DIR, "./query-templates");
const QUERY_SUBSTITUTIONS_DIR = path.join(PROJECT_DIR, "./substitution_parameters");

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

const WARMUP_COUNT = 3;

main()

async function main() {
    for (let i = 0; i < WARMUP_COUNT; i++) {
        const start = performance.now();
        await executeQuery("SELECT * WHERE { ?s ?p ?o } LIMIT 10");
        const end = performance.now();
        console.log(`Time taken to warmup (naively compute answer to query once): ${end - start} ms`);
    }
    
    const STABLE_COUNT = 3;
    
    let queryStrings = await getQueryStrings(path.join(PROJECT_DIR, "benchs/sp2b/sp2b/queries"));
    const queryStrings2 = [queryStrings[0]![1]!]

    let fQMaterialization = new FQMaterialization();
    let dQMaterialization = new DQMaterialization();

    //console.log(queryStrings2[0])
    for (const queryS of queryStrings2) {
        let qLogs = {
            avgs: { fq: {}, changeOne: {}, onlyOne: {} },
            stdDev: { fq: {}, changeOne: {}, onlyOne: {} },
        }

        const {changeOne: changeOneQuerySs, onlyOne: onlyOneQuerySs} = createQueryStringScenarios(queryS);
    
        let tLogs: Log[] = []
        for (let i = 0; i < STABLE_COUNT; i++) {
            fQMaterialization.mViews = [];
            dQMaterialization.mViews = [];
            console.log(String("--").repeat(80))
            tLogs.push(await runQuery(queryS, fQMaterialization, dQMaterialization));
        }
        ({avgs: qLogs.avgs.fq, stdDevs: qLogs.stdDev.fq} = mergeLogs(tLogs));
        tLogs = []
    
        const FQMFullQueryState = structuredClone(fQMaterialization.mViews);
        const DQMFullQueryState = structuredClone(dQMaterialization.mViews);
    
        for (const changeOneQueryS of changeOneQuerySs) {
            for (let i = 0; i < STABLE_COUNT; i++) {
                fQMaterialization.mViews = structuredClone(FQMFullQueryState);
                dQMaterialization.mViews = structuredClone(DQMFullQueryState);
                tLogs.push(await runQuery(changeOneQueryS, fQMaterialization, dQMaterialization));
            }
        }
        ({avgs: qLogs.avgs.changeOne, stdDevs: qLogs.stdDev.changeOne} = mergeLogs(tLogs));
        tLogs = []

        for (const onlyOneQueryS of onlyOneQuerySs) {
            for (let i = 0; i < STABLE_COUNT; i++) {
                fQMaterialization.mViews = structuredClone(FQMFullQueryState);
                dQMaterialization.mViews = structuredClone(DQMFullQueryState);
                tLogs.push(await runQuery(onlyOneQueryS, fQMaterialization, dQMaterialization));
            }
        }
        ({avgs: qLogs.avgs.onlyOne, stdDevs: qLogs.stdDev.onlyOne} = mergeLogs(tLogs));
        tLogs = []
        
        console.log(JSON.stringify(qLogs, null, 2));    
    
        console.log("=".repeat(100));
    }
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
