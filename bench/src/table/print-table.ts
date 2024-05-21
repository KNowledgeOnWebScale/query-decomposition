import path from "node:path";

import { DQMTimingK, FQMTimingK, TotalTimingK, type DQMTimings } from "../timings.js";
import { getContentsOfFilesInDir, PROJECT_DIR } from "../utils.js";

import { Row, Table } from "./table.js";

import type { QueriesLog } from "../log.js";
import type { ValueOf } from "type-fest";

export async function printTable(outputAsLatex: boolean): Promise<void> {
    const results = await getContentsOfFilesInDir(path.join(PROJECT_DIR, "results"));

    for (const [benchName, gLog_] of results) {
        const logs = JSON.parse(gLog_) as QueriesLog;

        for (const [queryName, log] of Object.entries(logs)) {
            console.log(String("=").repeat(50) + benchName + String("=").repeat(50));
            printOverviewTable(outputAsLatex, queryName, log);
            printDQMTable(outputAsLatex, queryName, log);
        }
    }
}

function printOverviewTable(outputAsLatex: boolean, queryName: string, log: ValueOf<QueriesLog>): void {
    const tbl = new Table([
        { name: "Size of materialized query answers", unit: "bytes" },
        { name: "Size of materialized query trees", unit: "bytes" },
        { name: "Total", unit: "ms" },
        { name: "Check if an e materialized view can be used", unit: "ms" },
    ] as const);

    for (const [t, situation] of [
        [log.avgs.fq, Row.FQ],
        [log.avgs.mfq, Row.MFQ],
        [log.avgs.onlyOne, Row.ONLY_ONE],
        [log.avgs.changeOne, Row.CHANGE_ONE],
    ] as const) {
        const { timings: fQMT, mViewSize: fQMVS } = t.fQMaterialization;
        const { timings: dQMT, mViewSize: dQMVS } = t.dQMaterialization;

        tbl.rows[situation] = {
            Total: {
                fQM: fQMT[TotalTimingK.TOTAL],
                dQM: dQMT[TotalTimingK.TOTAL],
            },
            "Check if an e materialized view can be used": {
                fQM: fQMT[FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms,
                dQM: dQMT[DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms,
            },
            "Size of materialized query answers": {
                fQM: fQMVS.answers.bytes,
                dQM: dQMVS.answers.bytes,
            },
            "Size of materialized query trees": {
                fQM: fQMVS.queries.bytes,
                dQM: dQMVS.queries.bytes,
            },
        };
        // //rows.translateToTree.push(`${fQMT[FQMTimingK.TRANSLATE_TO_TREE]!.ms.toFixed(CAD)} / ${dQMT[DQMTimingK.TRANSLATE_TO_TREE]!.ms.toFixed(CAD)}`)
        // rows.checkExistingMv.push(`${t.fQMaterialization.timings[FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms.toFixed(CAD)} / ${t.dQMaterialization.timings[DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms.toFixed(CAD)}`)

        // if (fQMT[FQMTimingK.MATERIALIZE_QUERY] !== null) {
        //     rows.materializeQ.push(
        //         fQMT[FQMTimingK.MATERIALIZE_QUERY].ms.toFixed(CAD) + " / " + (wasQueryAlreadyMaterialized(dQMT) ? "-" :
        //         (dQMT[TotalTimingK.TOTAL] - dQMT[DQMTimingK.TRANSLATE_TO_TREE]!.ms - dQMT[DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms).toFixed(CAD))
        //     )
        // } else {
        //     rows.materializeQ.push("-")
        // }

        // rows.mQueriesSize.push(fQMVS.queries.bytes.toFixed(CAD) + " / " + dQMVS.queries.bytes.toFixed(CAD))
        // rows.mViewsSize.push(fQMVS.answers.bytes.toFixed(CAD) + " / " + dQMVS.answers.bytes.toFixed(CAD))
        // rows.total.push(fQMT[TotalTimingK.TOTAL].toFixed(CAD) + " / " + dQMT[TotalTimingK.TOTAL].toFixed(CAD))
    }
    console.log(String("=").repeat(40) + queryName + String("=").repeat(40));
    tbl.print(outputAsLatex);

    // //console.log(`Time taken \\ Benchmark name \t\t\t${benchName}`)
    // console.log(`\t\t\t\t\t\tfq (ms)|mfq (ms)|onlyOne (ms)|changeOne (ms)`)
    // console.log("Sizeof Materialized query answers\t\t", rows.mViewsSize.join(" | "))
    // console.log("Sizeof Materialized query trees\t\t\t", rows.mQueriesSize.join(" | "))
    // console.log(`Total\t\t\t\t\t\t`, rows.total.join(" | "))
    // //console.log(`Translate to query tree\t\t\t\t`, rows.translateToTree.join(" | "))
    // console.log(`Check if an e materialized view can be used\t`, rows.checkExistingMv.join(" | "))
    //console.log("Materialize query\t\t\t\t", rows.materializeQ.join(" | "))
}

function printDQMTable(outputAsLatex: boolean, queryName: string, log: ValueOf<QueriesLog>): void {
    // const rows = {
    //     translateToRT: new Array<string>(),
    //     rewriteRT: new Array<string>(),
    //     translateFromRTToT: new Array<string>(),
    //     decomposeTree: new Array<string>(),
    //     checkSubqueryAM: new Array<string>(),
    //     materializeSubqueries: new Array<string>(),
    //     createVirtualQueryView: new Array<string>(),
    //     flattenVirtualQueryView: new Array<string>(),
    // };
    // assert(
    //     log.avgs.onlyOne.dQMaterialization.timings[DQMTimingK.MATERIALIZE_QUERY] === null,
    //     "Decomposed query materialization failed to property materialize subquery: " + queryName
    // )
    // for (const t of [
    //     log.avgs.fq,
    //     log.avgs.mfq,
    //     log.avgs.onlyOne,
    //     log.avgs.changeOne
    // ]) {
    //     const dQMT = t.dQMaterialization.timings;
    //     if (wasQueryAlreadyMaterialized(dQMT)) {
    //         Object.values(rows).forEach(x => x.push("-"));
    //         continue;
    //     }
    //     rows.translateToRT.push(
    //         dQMT[DQMTimingK.TRANSLATE_TO_REWRITE_TREE]!.ms.toFixed(CAD)
    //     );
    //     rows.rewriteRT.push(
    //         dQMT[DQMTimingK.REWRITE_TREE]!.ms.toFixed(CAD)
    //     );
    //     rows.translateFromRTToT.push(
    //         dQMT[DQMTimingK.TRANSLATE_FROM_REWRITE_TREE_TO_TREE]!.ms.toFixed(CAD)
    //     );
    //     rows.decomposeTree.push(
    //         (dQMT[DQMTimingK.DECOMPOSE_TREE]!.ms * 1000).toFixed(CAD)
    //     );
    //     rows.checkSubqueryAM.push(
    //         (dQMT[DQMTimingK.CHECK_EXISTING_MATERIALIZED_SQ_VIEW]!.ms).toFixed(CAD)
    //     );
    //     rows.materializeSubqueries.push(
    //         (dQMT[DQMTimingK.MATERIALIZE_SQS]!.ms).toFixed(CAD)
    //     );
    //     rows.createVirtualQueryView.push(
    //         (dQMT[DQMTimingK.MATERIALIZE_QUERY]!.ms).toFixed(CAD)
    //     );
    //     rows.flattenVirtualQueryView.push(
    //         (dQMT[DQMTimingK.ANSWER_QUERY_FROM_SQS]!.ms).toFixed(CAD)
    //     );
    // }
    // console.log(String("=").repeat(40) + queryName + String("=").repeat(40))
    // // console.log(`Time taken \\ Benchmark name \t\t\t${benchName}`)
    // console.log(`\t\t\t\t\t\tfq (ms)|mfq (ms)|onlyOne (ms)|changeOne (ms)`)
    // console.log(`Translate from query string to QRT\t\t`, rows.translateToRT.join(" | "))
    // console.log(`Rewrite query rewrite tree\t\t\t`, rows.rewriteRT.join(" | "))
    // console.log(`Translate from QRT to QS to QT\t\t\t`, rows.translateFromRTToT.join(" | "))
    // console.log(`Decompose query tree (µs)\t\t\t`, rows.decomposeTree.join(" | "))
    // console.log(`TTT to check if subquery is already materialized`, rows.checkSubqueryAM.join(" | "))
    // console.log(`TTT to materialize subqueries\t\t\t`, rows.materializeSubqueries.join(" | "))
    // console.log(`Create virtual query view\t\t\t`, rows.createVirtualQueryView.join(" | "))
    // console.log("Flatten virtual query view to answer\t\t", rows.flattenVirtualQueryView.join(" | "))
}

function wasQueryAlreadyMaterialized(dQMTiming: DQMTimings): boolean {
    return dQMTiming[DQMTimingK.TRANSLATE_TO_REWRITE_TREE] === null;
}
