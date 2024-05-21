import { strict as assert } from "node:assert";
import fs from "node:fs/promises";
import * as path from "node:path";

import { areUnorderedEqual } from "move-sparql-unions-to-top/tests/utils/index.js";

import { isCompleteLog, mergeLogs, type Log, type LogRaw, type QueriesLog, type ScenariosLog } from "./log.js";
import { DQMaterialization } from "./query-materialization/decomposed-query.js";
import { FQMaterialization } from "./query-materialization/full-query.js";
import { getQueryLimit as getQueryLimits } from "./query-materialization/query-limit.js";
import { getQueryStringScenarios as createQueryStringScenarios } from "./query-strings/create-query-scenarios.js";
import { getQueryStrings, getQueryStringsFromTemplates } from "./query-strings/get-query-strings.js";
import { PROJECT_DIR } from "./utils.js";

import type { Bindings } from "@rdfjs/types";

export type BenchmarkName = "bsdm" | "ldbc" | "sp2b";

await main();

async function main() {
    const STABLE_COUNT = 1;

    const BENCH_NAME: BenchmarkName = "bsdm";

    const queryStrings = await getQueryStringsForBench(BENCH_NAME);

    const fQMaterialization = new FQMaterialization();
    const dQMaterialization = new DQMaterialization();

    const qLogs: QueriesLog = {};
    for (const [queryName, queryInsts] of queryStrings.entries()) {
        const logs: ScenariosLog[] = [];
        for (const queryS of queryInsts) {
            const preWarmupFQMFullQueryState = FQMaterialization.cloneViews(fQMaterialization.mViews);
            const preWarmupDQMFullQueryState = DQMaterialization.cloneViews(dQMaterialization.views);
            await runQueryScenarios(queryS, fQMaterialization, dQMaterialization, { stableCount: 1 }); // Warmup
            fQMaterialization.mViews = preWarmupFQMFullQueryState;
            dQMaterialization.views = preWarmupDQMFullQueryState;

            console.log(String("==").repeat(40) + "WARMUP END" + String("==").repeat(40));

            const qLog = await runQueryScenarios(queryS, fQMaterialization, dQMaterialization, {
                stableCount: STABLE_COUNT,
            });

            logs.push(qLog);
        }
        const mergedLog = {
            fq: mergeLogs(logs.flatMap(x => x.fq)),
            mfq: mergeLogs(logs.flatMap(x => x.mfq)),
            changeOne: mergeLogs(logs.flatMap(x => x.changeOne)),
            onlyOne: mergeLogs(logs.flatMap(x => x.onlyOne)),
        };
        console.log(JSON.stringify(mergedLog, null, 2));

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

        console.log("=".repeat(100));
    }

    await fs.writeFile(path.join(PROJECT_DIR, "results", `${BENCH_NAME}.json`), JSON.stringify(qLogs, null, 2));
}

async function getQueryStringsForBench(benchName: BenchmarkName): Promise<Map<string, string[]>> {
    const isTemplated: { [key in BenchmarkName]: boolean } = {
        bsdm: true,
        ldbc: true,
        sp2b: false,
    };

    let rawQueries: { name: string; queries: string[] }[];
    if (isTemplated[benchName]) {
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
        fQMaterialization.mViews = [];
        dQMaterialization.views = [];
        tLogs.push(await runQuery(queryS, fQMaterialization, dQMaterialization));
    }
    qLog.fq = tLogs;
    tLogs = [];
    console.log(String("--").repeat(80));

    const fQMFullQueryState = FQMaterialization.cloneViews(fQMaterialization.mViews);
    const dQMFullQueryState = DQMaterialization.cloneViews(dQMaterialization.views);

    for (let i = 0; i < opts.stableCount; i++) {
        fQMaterialization.mViews = FQMaterialization.cloneViews(fQMFullQueryState);
        dQMaterialization.views = DQMaterialization.cloneViews(dQMFullQueryState);
        tLogs.push(await runQuery(queryS, fQMaterialization, dQMaterialization));
    }
    qLog.mfq = tLogs;
    tLogs = [];
    console.log(String("--").repeat(80));

    for (const changeOneQueryS of changeOneQuerySs) {
        for (let i = 0; i < opts.stableCount; i++) {
            fQMaterialization.mViews = FQMaterialization.cloneViews(fQMFullQueryState);
            dQMaterialization.views = DQMaterialization.cloneViews(dQMFullQueryState);
            tLogs.push(await runQuery(changeOneQueryS, fQMaterialization, dQMaterialization));
        }
    }
    qLog.changeOne = tLogs;
    tLogs = [];
    console.log(String("--").repeat(80));

    for (const onlyOneQueryS of onlyOneQuerySs) {
        for (let i = 0; i < opts.stableCount; i++) {
            fQMaterialization.mViews = FQMaterialization.cloneViews(fQMFullQueryState);
            dQMaterialization.views = DQMaterialization.cloneViews(dQMFullQueryState);
            tLogs.push(await runQuery(onlyOneQueryS, fQMaterialization, dQMaterialization));
        }
    }
    qLog.onlyOne = tLogs;
    tLogs = [];

    return qLog;
}

async function runQuery(
    queryS: string,
    fQMaterialization: FQMaterialization,
    dQMaterialization: DQMaterialization,
): Promise<Log> {
    const log: LogRaw = { fQMaterialization: {}, dQMaterialization: {} };

    const queryLimits = getQueryLimits(queryS);

    let fQMAnswer: Bindings[];
    {
        [fQMAnswer, log.fQMaterialization.timings] = await fQMaterialization.answerQuery(queryS, queryLimits.query);

        const viewSize = fQMaterialization.roughSizeOfMaterializedViews();
        const total = viewSize.queryTrees + viewSize.answers;
        log.fQMaterialization.mViewSize = {
            queries: { bytes: viewSize.queryTrees, pct: viewSize.queryTrees / total },
            answers: { bytes: viewSize.answers, pct: viewSize.answers / total },
        };
    }

    let dQMAnswer: Bindings[];
    {
        [dQMAnswer, log.dQMaterialization.timings] = await dQMaterialization.answerQuery(queryS, queryLimits.subquery);

        const viewSize = dQMaterialization.roughSizeOfMaterializedViews();
        const total = viewSize.queryTrees + viewSize.answers;
        log.dQMaterialization.mViewSize = {
            queries: { bytes: viewSize.queryTrees, pct: viewSize.queryTrees / total },
            answers: { bytes: viewSize.answers, pct: viewSize.answers / total },
        };
    }

    log.dQMtoFQMViewSizePct = {
        queries: log.dQMaterialization.mViewSize.queries.bytes / log.fQMaterialization.mViewSize.queries.bytes,
        answers: log.dQMaterialization.mViewSize.answers.bytes / log.dQMaterialization.mViewSize.answers.bytes,
        total:
            (log.dQMaterialization.mViewSize.queries.bytes + log.dQMaterialization.mViewSize.answers.bytes) /
            (log.fQMaterialization.mViewSize.queries.bytes + log.dQMaterialization.mViewSize.answers.bytes),
    };

    // If the hard limit is reached, then the concatenation of subquery results might no longer include
    // the same bindings as the single query because the bindings are returned in no particular order...
    if (fQMAnswer.length !== queryLimits.query) {
        assert(
            areUnorderedEqual(fQMAnswer, dQMAnswer, (x, y) => {
                // Ensure the methods didn't get lost in a clone operation
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                assert(x.equals !== undefined && y.equals !== undefined);
                return x.equals(y);
            }),
            "Query answer given by full query and decomposed query materialization don't match",
        );
    }

    assert(isCompleteLog(log));

    return log;
}
