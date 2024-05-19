import { calcAvg, calcAvgO, calcAvgON, calcStdDev, calcStdDevO, calcStdDevON } from "./stats.js";
import { DQMTimingK, FQMTimingK, TotalTimingK, type DQMTimings, type FQMTimings } from "./timings.js";

import type { Log } from "./index.js";

export function mergeLogs(logs: Log[]): { avgs: Log; stdDevs: Log } {
    const timings4: Partial<FQMTimings> = {};
    for (const t of Object.values(FQMTimingK)) {
        timings4[t] = calcAvgON(logs.map(x => x.fQMaterialization.timings[t]));
    }
    timings4[TotalTimingK.TOTAL] = calcAvg(logs.map(x => x.fQMaterialization.timings[TotalTimingK.TOTAL]));

    const timings5: Partial<DQMTimings> = {};
    for (const t of Object.values(DQMTimingK)) {
        timings5[t] = calcAvgON(logs.map(x => x.dQMaterialization.timings[t]));
    }
    timings5[TotalTimingK.TOTAL] = calcAvg(logs.map(x => x.dQMaterialization.timings[TotalTimingK.TOTAL]));

    const avgs: Log = {
        fQMaterialization: {
            timings: timings4 as FQMTimings,
            mViewSize: {
                queries: calcAvgO(logs.map(x => x.fQMaterialization.mViewSize.queries)),
                answers: calcAvgO(logs.map(x => x.fQMaterialization.mViewSize.answers)),
            },
        },
        dQMaterialization: {
            timings: timings5 as DQMTimings,
            mViewSize: {
                queries: calcAvgO(logs.map(x => x.dQMaterialization.mViewSize.queries)),
                answers: calcAvgO(logs.map(x => x.dQMaterialization.mViewSize.answers)),
            },
        },
        dQMtoFQMViewSizePct: calcAvgO(logs.map(x => x.dQMtoFQMViewSizePct)),
    };

    const timings2: Partial<FQMTimings> = {};
    for (const t of Object.values(FQMTimingK)) {
        timings2[t] = calcStdDevON(
            logs.map(x => x.fQMaterialization.timings[t]),
            avgs.fQMaterialization.timings[t],
        );
    }
    timings2[TotalTimingK.TOTAL] = calcStdDev(
        logs.map(x => x.fQMaterialization.timings[TotalTimingK.TOTAL]),
        avgs.fQMaterialization.timings[TotalTimingK.TOTAL],
    );

    const timings3: Partial<DQMTimings> = {};
    for (const t of Object.values(DQMTimingK)) {
        timings3[t] = calcStdDevON(
            logs.map(x => x.dQMaterialization.timings[t]),
            avgs.dQMaterialization.timings[t],
        );
    }
    timings3[TotalTimingK.TOTAL] = calcStdDev(
        logs.map(x => x.dQMaterialization.timings[TotalTimingK.TOTAL]),
        avgs.dQMaterialization.timings[TotalTimingK.TOTAL],
    );

    const stdDevs: Log = {
        fQMaterialization: {
            timings: timings2 as FQMTimings,
            mViewSize: {
                queries: calcStdDevO(
                    logs.map(x => x.fQMaterialization.mViewSize.queries),
                    avgs.fQMaterialization.mViewSize.queries,
                ),
                answers: calcStdDevO(
                    logs.map(x => x.fQMaterialization.mViewSize.answers),
                    avgs.fQMaterialization.mViewSize.answers,
                ),
            },
        },
        dQMaterialization: {
            timings: timings3 as DQMTimings,
            mViewSize: {
                queries: calcStdDevO(
                    logs.map(x => x.dQMaterialization.mViewSize.queries),
                    avgs.dQMaterialization.mViewSize.queries,
                ),
                answers: calcStdDevO(
                    logs.map(x => x.dQMaterialization.mViewSize.answers),
                    avgs.dQMaterialization.mViewSize.answers,
                ),
            },
        },
        dQMtoFQMViewSizePct: calcStdDevO(
            logs.map(x => x.dQMtoFQMViewSizePct),
            avgs.dQMtoFQMViewSizePct,
        ),
    };

    return { avgs, stdDevs };
}
