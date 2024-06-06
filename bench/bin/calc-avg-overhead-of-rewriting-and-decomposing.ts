import assert from "node:assert/strict";
import path from "node:path";

import { QueriesLog } from "../src/log.js";
import { DQMTimingK, TotalTimingK } from "../src/timings.js";
import { getContentsOfFilesInDir, PROJECT_DIR } from "../src/utils.js";

const totals = (await getContentsOfFilesInDir(path.join(PROJECT_DIR, "results")))
    .map(x => {
        const benchName = path.basename(x[0], path.extname(x[0]));
        const logs = JSON.parse(x[1]) as QueriesLog;

        return [benchName, logs] as const;
    })
    .flatMap(([benchName, queriesLog]) => {
        return Object.entries(queriesLog)
            .map(([k, v]) => [k, v.avgs.fq] as const)
            .map(([queryName, scenariosLog]) => {
                const dQMTimings = scenariosLog.dQMaterialization.timings;

                const rewriteTime =
                    dQMTimings[DQMTimingK.REWRITE_TREE]!.ms +
                    dQMTimings[DQMTimingK.TRANSLATE_TO_REWRITE_TREE]!.ms +
                    dQMTimings[DQMTimingK.TRANSLATE_FROM_REWRITE_TREE_TO_TREE]!.ms;
                const rewriteAndDecomposeTime = rewriteTime + dQMTimings[DQMTimingK.DECOMPOSE_TREE]!.ms;
                const totalTime = dQMTimings[TotalTimingK.TOTAL];
                console.log(`${benchName} > ${queryName}: ${rewriteAndDecomposeTime} / ${totalTime}`);
                return rewriteAndDecomposeTime / totalTime;
            });
    });

assert(totals.length > 0);
const avg = totals.reduce((acc, e) => acc + e) / totals.length;
console.log((avg * 100).toFixed(2));
