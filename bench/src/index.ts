import { strict as assert } from "node:assert";
import fs from "node:fs/promises";
import * as path from "node:path";

import { areUnorderedEqual } from "rewrite-sparql-unions-to-top/tests/utils/index.js";

import { isCompleteLog, mergeLogs, type Log, type LogRaw, type QueriesLog, type ScenariosLog } from "./log.js";
import { DQMaterialization } from "./query-materialization/decomposed-query.js";
import { FQMaterialization } from "./query-materialization/full-query.js";
import { getQueryStringScenarios as createQueryStringScenarios } from "./query-strings/create-query-scenarios.js";
import { getQueryStrings, getQueryStringsFromTemplates } from "./query-strings/get-query-strings.js";
import { PROJECT_DIR } from "./utils.js";

import type { Bindings } from "@rdfjs/types";

export const BENCHMARK_NAMES = ["bsbm", "ldbc", "sp2b"] as const;
export type BenchmarkName = (typeof BENCHMARK_NAMES)[number];

export async function main(dataSource: BenchmarkName): Promise<void> {
    const WARMUP_COUNT = 2;
    const STABLE_COUNT = 10;

    console.log(`Warmup count = ${WARMUP_COUNT} and Stable count = ${STABLE_COUNT}`);

    const queryStrings = await getQueryStringsForBench(dataSource);

    const fQMaterialization = new FQMaterialization();
    const dQMaterialization = new DQMaterialization();

    const qLogs: QueriesLog = {};
    for (const [queryName, queryInsts] of queryStrings.entries()) {
        const logs: ScenariosLog[] = [];
        for (const queryS of queryInsts) {
            const preWarmupFQMFullQueryState = FQMaterialization.cloneViews(fQMaterialization.views);
            const preWarmupDQMFullQueryState = DQMaterialization.cloneViews(dQMaterialization.views);
            await runQueryScenarios(queryS, fQMaterialization, dQMaterialization, { stableCount: WARMUP_COUNT }); // Warmup
            fQMaterialization.views = preWarmupFQMFullQueryState;
            dQMaterialization.views = preWarmupDQMFullQueryState;

            //console.log(String("==").repeat(40) + "WARMUP END" + String("==").repeat(40));

            const qLog = await runQueryScenarios(queryS, fQMaterialization, dQMaterialization, {
                stableCount: STABLE_COUNT,
            });

            logs.push(qLog);
            break;
        }
        const mergedLog = {
            fq: mergeLogs(logs.flatMap(x => x.fq)),
            mfq: mergeLogs(logs.flatMap(x => x.mfq)),
            changeOne: mergeLogs(logs.flatMap(x => x.changeOne)),
            onlyOne: mergeLogs(logs.flatMap(x => x.onlyOne)),
        };
        qLogs[queryName] = {
            avgs: {
                fq: mergedLog.fq.avgs,
                mfq: mergedLog.mfq.avgs,
                onlyOne: mergedLog.onlyOne.avgs,
                changeOne: mergedLog.changeOne.avgs,
            },
            stdDevs: {
                fq: mergedLog.fq.stdDevs,
                mfq: mergedLog.mfq.stdDevs,
                onlyOne: mergedLog.onlyOne.stdDevs,
                changeOne: mergedLog.changeOne.stdDevs,
            },
        };
        //console.log(JSON.stringify(qLogs[queryName]!.avgs, null, 2));
        //console.log("=".repeat(100));
    }

    await fs.writeFile(path.join(PROJECT_DIR, "results", `${dataSource}.json`), JSON.stringify(qLogs, null, 2));
}

export const isDataSourceTemplated: { [key in BenchmarkName]: boolean } = {
    bsbm: true,
    ldbc: true,
    sp2b: false,
};

async function getQueryStringsForBench(benchName: BenchmarkName): Promise<Map<string, string[]>> {
    let rawQueries: { name: string; queries: string[] }[];
    if (isDataSourceTemplated[benchName]) {
        rawQueries = await getQueryStringsFromTemplates(
            path.join(PROJECT_DIR, "data_sources", benchName, "query_templates"),
            path.join(PROJECT_DIR, "data_sources", benchName, "query_substitution_parameters"),
        );
    } else {
        rawQueries = (await getQueryStrings(path.join(PROJECT_DIR, "data_sources", benchName, "queries"))).map(x => {
            return { name: x.name, queries: [x.value] };
        });
    }

    // Queries with an `_[a-z]` prefix originate from the same query
    const queries = new Map<string, string[]>();
    for (const query of rawQueries) {
        const name = query.name.replace(/_[a-z]$/, "");

        if (queries.has(name)) {
            queries.get(name)!.push(...query.queries);
        } else {
            queries.set(name, query.queries);
        }
    }
    return queries;
}

async function runQueryScenarios(
    queryS: string,
    fQMaterialization: FQMaterialization,
    dQMaterialization: DQMaterialization,
    opts: { stableCount: number },
): Promise<ScenariosLog> {
    const qLog = {
        fq: new Array<Log>(),
        mfq: Array<Log>(),
        changeOne: Array<Log>(),
        onlyOne: Array<Log>(),
    };

    const { changeOne: changeOneQuerySs, onlyOne: onlyOneQuerySs } = createQueryStringScenarios(queryS);

    let tLogs: Log[] = [];
    for (let i = 0; i < opts.stableCount; i++) {
        fQMaterialization.views = [];
        dQMaterialization.views = [];
        tLogs.push(await runQuery(queryS, fQMaterialization, dQMaterialization));
    }
    qLog.fq = tLogs;
    tLogs = [];
    console.log(String("--").repeat(80));

    const fQMFullQueryState = FQMaterialization.cloneViews(fQMaterialization.views);
    const dQMFullQueryState = DQMaterialization.cloneViews(dQMaterialization.views);

    for (let i = 0; i < opts.stableCount; i++) {
        fQMaterialization.views = FQMaterialization.cloneViews(fQMFullQueryState);
        dQMaterialization.views = DQMaterialization.cloneViews(dQMFullQueryState);
        tLogs.push(await runQuery(queryS, fQMaterialization, dQMaterialization));
    }
    qLog.mfq = tLogs;
    tLogs = [];
    console.log(String("--").repeat(80));

    for (const onlyOneQueryS of onlyOneQuerySs) {
        for (let i = 0; i < opts.stableCount; i++) {
            fQMaterialization.views = FQMaterialization.cloneViews(fQMFullQueryState);
            dQMaterialization.views = DQMaterialization.cloneViews(dQMFullQueryState);
            tLogs.push(await runQuery(onlyOneQueryS, fQMaterialization, dQMaterialization));
        }
    }
    qLog.onlyOne = tLogs;
    tLogs = [];
    console.log(String("--").repeat(80));

    for (const changeOneQueryS of changeOneQuerySs) {
        for (let i = 0; i < opts.stableCount; i++) {
            fQMaterialization.views = FQMaterialization.cloneViews(fQMFullQueryState);
            dQMaterialization.views = DQMaterialization.cloneViews(dQMFullQueryState);
            tLogs.push(await runQuery(changeOneQueryS, fQMaterialization, dQMaterialization));
        }
    }
    qLog.changeOne = tLogs;
    tLogs = [];
    console.log(String("--").repeat(80));

    return qLog;
}

export const QUERY_RESULT_ROW_LIMIT = 10_000; // Taken over from virtuoso

async function runQuery(
    queryS: string,
    fQMaterialization: FQMaterialization,
    dQMaterialization: DQMaterialization,
): Promise<Log> {
    const log: LogRaw = { fQMaterialization: {}, dQMaterialization: {} };

    let fQMAnswer: Bindings[];
    {
        [fQMAnswer, log.fQMaterialization.timings] = await fQMaterialization.answerQuery(
            queryS,
            QUERY_RESULT_ROW_LIMIT,
        );

        const viewSize = fQMaterialization.roughSizeOfMaterializedViews();
        const total = viewSize.queryTrees + viewSize.answers;
        log.fQMaterialization.viewSize = {
            queries: { bytes: viewSize.queryTrees, pct: viewSize.queryTrees / total },
            answers: { bytes: viewSize.answers, pct: viewSize.answers / total },
        };
    }

    let dQMAnswer: Bindings[];
    {
        [dQMAnswer, log.dQMaterialization.timings] = await dQMaterialization.answerQuery(
            queryS,
            QUERY_RESULT_ROW_LIMIT,
        );

        const viewSize = dQMaterialization.roughSizeOfMaterializedViews();
        const total = viewSize.queryTrees + viewSize.answers;
        log.dQMaterialization.viewSize = {
            queries: { bytes: viewSize.queryTrees, pct: viewSize.queryTrees / total },
            answers: { bytes: viewSize.answers, pct: viewSize.answers / total },
        };
    }

    log.dQMtoFQViewSizePct = {
        queries: log.dQMaterialization.viewSize.queries.bytes / log.fQMaterialization.viewSize.queries.bytes,
        answers: log.dQMaterialization.viewSize.answers.bytes / log.dQMaterialization.viewSize.answers.bytes,
        total:
            (log.dQMaterialization.viewSize.queries.bytes + log.dQMaterialization.viewSize.answers.bytes) /
            (log.fQMaterialization.viewSize.queries.bytes + log.dQMaterialization.viewSize.answers.bytes),
    };

    assert(
        areUnorderedEqual(fQMAnswer, dQMAnswer, (x, y) => {
            // Ensure the methods didn't get lost in a clone operation
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            assert(x.equals !== undefined && y.equals !== undefined);
            return x.equals(y);
        }),
        "Query answer given by full query and decomposed query materialization don't match",
    );

    assert(isCompleteLog(log));

    return log;
}
