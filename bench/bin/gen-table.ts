import path from "node:path"
import{ getContentsOfFilesInDir, PROJECT_DIR} from "../src/utils.js"
import {ScenariosLog} from "../src/index.js"
import { DQMTimingK, FQMTimingK, TotalTimingK } from "../src/timings.js";

const results = await getContentsOfFilesInDir(path.join(PROJECT_DIR, "results"))

const NAC = 2; 

for (const [benchName, result_] of results) {
    const result: ScenariosLog[] = JSON.parse(result_);

    const rows = {
        translateToTree: new Array<string>(),
        checkExistingMv: new Array<string>(),
        materializeQ: new Array<string>(),
    };
    for (const [i, scenarioLog] of result.entries()) {
        for (const t of [
            scenarioLog.avgs.fq,
            scenarioLog.avgs.cfq,
            scenarioLog.avgs.onlyOne,
            scenarioLog.avgs.changeOne
        ]) {
            const fQM = t.fQMaterialization.timings;
            const dQM = t.dQMaterialization.timings;

            rows.translateToTree.push(`${fQM[FQMTimingK.TRANSLATE_TO_TREE]!.ms.toFixed(NAC)} / ${dQM[DQMTimingK.TRANSLATE_TO_TREE]!.ms.toFixed(NAC)}`)
            rows.checkExistingMv.push(`${t.fQMaterialization.timings[FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms.toFixed(NAC)} / ${t.dQMaterialization.timings[DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms.toFixed(NAC)}`)

            rows.materializeQ.push(
                (fQM[TotalTimingK.TOTAL] - fQM[FQMTimingK.TRANSLATE_TO_TREE]!.ms - fQM[FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms).toFixed(NAC) + " / " +
                (dQM[TotalTimingK.TOTAL] - dQM[DQMTimingK.TRANSLATE_TO_TREE]!.ms - dQM[DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms).toFixed(NAC)
            )
        }
        console.log(`Time taken \\ Benchmark name \t\t\t${benchName}`)
        console.log(`\t\t\tfq (ms)|mfq (ms)|onlyOne (ms)|changeOne (ms)`)
        console.log(`Translate to query tree\t\t\t\t`, rows.translateToTree.join(" | "))
        console.log(`Check if an e materialized view can be used\t`, rows.checkExistingMv.join(" | "))
        console.log("Materialize query\t\t\t\t", rows.materializeQ.join(" | "))
    }

    const rows = {
        translateToTree: new Array<string>(),
        checkExistingMv: new Array<string>(),
        materializeQ: new Array<string>(),
    };
    for (const [i, scenarioLog] of result.entries()) {
        for (const t of [
            scenarioLog.avgs.fq,
            scenarioLog.avgs.cfq,
            scenarioLog.avgs.onlyOne,
            scenarioLog.avgs.changeOne
        ]) {
            const dQM = t.dQMaterialization.timings;

            rows.translateToTree.push(`${fQM[FQMTimingK.TRANSLATE_TO_TREE]!.ms.toFixed(NAC)} / ${dQM[DQMTimingK.TRANSLATE_TO_TREE]!.ms.toFixed(NAC)}`)
            rows.checkExistingMv.push(`${t.fQMaterialization.timings[FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms.toFixed(NAC)} / ${t.dQMaterialization.timings[DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms.toFixed(NAC)}`)

            rows.materializeQ.push(
                (fQM[TotalTimingK.TOTAL] - fQM[FQMTimingK.TRANSLATE_TO_TREE]!.ms - fQM[FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms).toFixed(NAC) + " / " +
                (dQM[TotalTimingK.TOTAL] - dQM[DQMTimingK.TRANSLATE_TO_TREE]!.ms - dQM[DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]!.ms).toFixed(NAC)
            )
        }
        console.log(`Time taken \\ Benchmark name \t\t\t${benchName}`)
        console.log(`\t\t\tfq (ms)|mfq (ms)|onlyOne (ms)|changeOne (ms)`)
        console.log(`Translate to query tree\t\t\t\t`, rows.translateToTree.join(" | "))
        console.log(`Check if an e materialized view can be used\t`, rows.checkExistingMv.join(" | "))
        console.log("Materialize query\t\t\t\t", rows.materializeQ.join(" | "))
    }
}