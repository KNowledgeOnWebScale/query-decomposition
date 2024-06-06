import path from "node:path";

import { DQMTimingK, FQMTimingK, TotalTimingK } from "../timings.js";
import { getContentsOfFilesInDir, PROJECT_DIR } from "../utils.js";

import { Col, Table } from "./table.js";

import type { BenchmarkName } from "../index.js";
import type { QueriesLog } from "../log.js";

enum Row {
    VIEWS_SIZE = "Sizeof views",
    QUERY_TREES_SIZE = "Sizeof query trees",
    TOTAL = "Total",
    CHECK_EXISTING_VIEW = "Check if an existing view \\\\ can be used",
    REWRITING = "Rewrite query tree",
}

export async function printTable(stdDevs: boolean): Promise<void> {
    const title =
        "Comparison of Full-Query and Decomposed Query Materialization" + (stdDevs ? " Standard Deviations" : "");

    const results = new Map(
        (await getContentsOfFilesInDir(path.join(PROJECT_DIR, "results"))).map(x => {
            const benchName = path.basename(x[0], path.extname(x[0]));
            const logs = JSON.parse(x[1]) as QueriesLog;

            return [benchName, logs];
        }),
    );

    const table = [
        "\\begin{table}[H]",
        "\\centering",
        `\\caption{${title}}`,
        createTable(stdDevs, "ldbc", results.get("ldbc")!),
        "\\end{table}",
        "\\begin{table}[H]\\ContinuedFloat",
        "\\centering",
        `\\caption{${title} (continued)}`,
        createTable(stdDevs, "bsbm", results.get("bsbm")!),
        createTable(stdDevs, "sp2b", results.get("sp2b")!),
        "\\end{table}",
    ].join("\n");

    console.log(table);
}

function createTable(stdDevs: boolean, benchName: BenchmarkName, qLogs: QueriesLog): string {
    const table = new Table(
        benchName,
        [
            { name: Row.VIEWS_SIZE, unit: "bytes" },
            { name: Row.QUERY_TREES_SIZE, unit: "bytes" },
            { name: Row.TOTAL, unit: "ms" },
            { name: Row.CHECK_EXISTING_VIEW, unit: "ms" },
            { name: Row.REWRITING, unit: "ms" },
        ] as const,
        stdDevs ? "0.75" : "0.90",
    );

    for (const [queryName, log_] of Object.entries(qLogs)) {
        table.rows[queryName] = {};
        const log = stdDevs ? log_.stdDevs : log_.avgs;

        for (const [row, sitLog] of [
            [Col.FQ, log.fq],
            [Col.MFQ, log.mfq],
            [Col.ONLY_ONE, log.onlyOne],
            [Col.CHANGE_ONE, log.changeOne],
        ] as const) {
            const { timings: fQMT, viewSize: fQMVS } = sitLog.fQMaterialization;
            const { timings: dQMT, viewSize: dQMVS } = sitLog.dQMaterialization;

            table.rows[queryName]![row] = {
                [Row.TOTAL]: {
                    fQM: fQMT[TotalTimingK.TOTAL],
                    dQM: dQMT[TotalTimingK.TOTAL],
                },
                [Row.CHECK_EXISTING_VIEW]: {
                    fQM: fQMT[FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms,
                    dQM: dQMT[DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms,
                },
                [Row.VIEWS_SIZE]: {
                    fQM: fQMVS.answers.bytes,
                    dQM: dQMVS.answers.bytes,
                },
                [Row.QUERY_TREES_SIZE]: {
                    fQM: fQMVS.queries.bytes,
                    dQM: dQMVS.queries.bytes,
                },
                [Row.REWRITING]: {
                    fQM: null,
                    dQM:
                        dQMT[DQMTimingK.REWRITE_TREE] !== null
                            ? dQMT[DQMTimingK.REWRITE_TREE].ms +
                              dQMT[DQMTimingK.TRANSLATE_TO_REWRITE_TREE]!.ms +
                              dQMT[DQMTimingK.TRANSLATE_TO_REWRITE_TREE]!.ms
                            : null,
                },
            };
        }
    }
    return table.toLaTeX();
}
