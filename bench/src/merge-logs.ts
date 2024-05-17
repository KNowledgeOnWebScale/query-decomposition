import type { Log } from "./index.js";
import { DQMTimingK, FQMTimingK, TotalTimingK } from "./timings.js";
import { calcAvg, calcAvgO, calcAvgON, calcStdDev, calcStdDevO, calcStdDevON } from "./stats.js";

export function mergeLogs(logs: Log[]) {
    const avgs: Log = {
        fQMaterialization: {
            timings: {
                [FQMTimingK.TRANSLATE_TO_TREE]: calcAvgON(logs.map(x => x.fQMaterialization.timings[FQMTimingK.TRANSLATE_TO_TREE])),
                [FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]: calcAvgON(logs.map(x => x.fQMaterialization.timings[FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW])),
                [FQMTimingK.COMPUTE_ANSWER_TO_QUERY]: calcAvgON(logs.map(x => x.fQMaterialization.timings[FQMTimingK.COMPUTE_ANSWER_TO_QUERY])),
                [FQMTimingK.MATERIALIZE_ANSWER_TO_QUERY]: calcAvgON(logs.map(x => x.fQMaterialization.timings[FQMTimingK.MATERIALIZE_ANSWER_TO_QUERY])),
                [TotalTimingK.TOTAL]: calcAvg(logs.map(x => x.fQMaterialization.timings[TotalTimingK.TOTAL])),
            },
            mViewSize: {
                queries: calcAvgO(logs.map(x => x.fQMaterialization.mViewSize.queries)),
                answers: calcAvgO(logs.map(x => x.fQMaterialization.mViewSize.answers)),
            }
        },
        dQMaterialization: {
            timings: {
                [DQMTimingK.TRANSLATE_TO_TREE]: calcAvgON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.TRANSLATE_TO_TREE])),
                [DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]: calcAvgON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW])),
                [DQMTimingK.TRANSLATE_TO_REWRITE_TREE]: calcAvgON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.TRANSLATE_TO_REWRITE_TREE])),
                [DQMTimingK.REWRITE_TREE]: calcAvgON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.REWRITE_TREE])),
                [DQMTimingK.DECOMPOSE_TREE]: calcAvgON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.DECOMPOSE_TREE])),
                [DQMTimingK.TRANSLATE_SQS_TO_REWRITE_TREES]: calcAvgON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.TRANSLATE_SQS_TO_REWRITE_TREES])),
                [DQMTimingK.TRANSLATE_SQS_TO_TREE]: calcAvgON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.TRANSLATE_SQS_TO_TREE])),
                [DQMTimingK.CHECK_EXISTING_MATERIALIZED_SQ_VIEW]: calcAvgON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.CHECK_EXISTING_MATERIALIZED_SQ_VIEW])),
                [DQMTimingK.ANSWER_SQS]: calcAvgON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.ANSWER_SQS])),
                [DQMTimingK.MATERIALIZE_SQS]: calcAvgON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.MATERIALIZE_SQS])),
                [DQMTimingK.MATERIALIZE_AND_ANSWER_SQS]: calcAvgON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.MATERIALIZE_AND_ANSWER_SQS])),
                [DQMTimingK.MATERIALIZE_QUERY]: calcAvgON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.MATERIALIZE_QUERY])),
                [DQMTimingK.ANSWER_QUERY_FROM_SQS]: calcAvgON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.ANSWER_QUERY_FROM_SQS])),
                [TotalTimingK.TOTAL]: calcAvg(logs.map(x => x.dQMaterialization.timings[TotalTimingK.TOTAL])),
            },
            mViewSize: {
                queries: calcAvgO(logs.map(x => x.dQMaterialization.mViewSize.queries)),
                answers: calcAvgO(logs.map(x => x.dQMaterialization.mViewSize.answers)),
            }
        },
        dQMtoFQMViewSizePct: calcAvgO(logs.map(x => x.dQMtoFQMViewSizePct))
    }

    const stdDevs: Log = {
        fQMaterialization: {
            timings: {
                [FQMTimingK.TRANSLATE_TO_TREE]: calcStdDevON(logs.map(x => x.fQMaterialization.timings[FQMTimingK.TRANSLATE_TO_TREE]), avgs.fQMaterialization.timings[FQMTimingK.TRANSLATE_TO_TREE]),
                [FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]: calcStdDevON(logs.map(x => x.fQMaterialization.timings[FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]), avgs.fQMaterialization.timings[FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]),
                [FQMTimingK.COMPUTE_ANSWER_TO_QUERY]: calcStdDevON(logs.map(x => x.fQMaterialization.timings[FQMTimingK.COMPUTE_ANSWER_TO_QUERY]), avgs.fQMaterialization.timings[FQMTimingK.COMPUTE_ANSWER_TO_QUERY]),
                [FQMTimingK.MATERIALIZE_ANSWER_TO_QUERY]: calcStdDevON(logs.map(x => x.fQMaterialization.timings[FQMTimingK.MATERIALIZE_ANSWER_TO_QUERY]), avgs.fQMaterialization.timings[FQMTimingK.MATERIALIZE_ANSWER_TO_QUERY]),
                [TotalTimingK.TOTAL]: calcStdDev(logs.map(x => x.fQMaterialization.timings[TotalTimingK.TOTAL]), avgs.fQMaterialization.timings[TotalTimingK.TOTAL]),
            },
            mViewSize: {
                queries: calcStdDevO(logs.map(x => x.fQMaterialization.mViewSize.queries), avgs.fQMaterialization.mViewSize.queries),
                answers: calcStdDevO(logs.map(x => x.fQMaterialization.mViewSize.answers), avgs.fQMaterialization.mViewSize.answers),
            }
        },
        dQMaterialization: {
            timings: {
                [DQMTimingK.TRANSLATE_TO_TREE]: calcStdDevON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.TRANSLATE_TO_TREE]), avgs.dQMaterialization.timings[DQMTimingK.TRANSLATE_TO_TREE]),
                [DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]: calcStdDevON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]), avgs.dQMaterialization.timings[DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]),
                [DQMTimingK.TRANSLATE_TO_REWRITE_TREE]: calcStdDevON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.TRANSLATE_TO_REWRITE_TREE]), avgs.dQMaterialization.timings[DQMTimingK.TRANSLATE_TO_REWRITE_TREE]),
                [DQMTimingK.REWRITE_TREE]: calcStdDevON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.REWRITE_TREE]), avgs.dQMaterialization.timings[DQMTimingK.REWRITE_TREE]),
                [DQMTimingK.DECOMPOSE_TREE]: calcStdDevON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.DECOMPOSE_TREE]), avgs.dQMaterialization.timings[DQMTimingK.DECOMPOSE_TREE]),
                [DQMTimingK.TRANSLATE_SQS_TO_REWRITE_TREES]: calcStdDevON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.TRANSLATE_SQS_TO_REWRITE_TREES]), avgs.dQMaterialization.timings[DQMTimingK.TRANSLATE_SQS_TO_REWRITE_TREES]),
                [DQMTimingK.TRANSLATE_SQS_TO_TREE]: calcStdDevON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.TRANSLATE_SQS_TO_TREE]), avgs.dQMaterialization.timings[DQMTimingK.TRANSLATE_SQS_TO_TREE]),
                [DQMTimingK.CHECK_EXISTING_MATERIALIZED_SQ_VIEW]: calcStdDevON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.CHECK_EXISTING_MATERIALIZED_SQ_VIEW]), avgs.dQMaterialization.timings[DQMTimingK.CHECK_EXISTING_MATERIALIZED_SQ_VIEW]),
                [DQMTimingK.ANSWER_SQS]: calcStdDevON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.ANSWER_SQS]), avgs.dQMaterialization.timings[DQMTimingK.ANSWER_SQS]),
                [DQMTimingK.MATERIALIZE_SQS]: calcStdDevON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.MATERIALIZE_SQS]), avgs.dQMaterialization.timings[DQMTimingK.MATERIALIZE_SQS]),
                [DQMTimingK.MATERIALIZE_AND_ANSWER_SQS]: calcStdDevON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.MATERIALIZE_AND_ANSWER_SQS]), avgs.dQMaterialization.timings[DQMTimingK.MATERIALIZE_AND_ANSWER_SQS]),
                [DQMTimingK.MATERIALIZE_QUERY]: calcStdDevON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.MATERIALIZE_QUERY]), avgs.dQMaterialization.timings[DQMTimingK.MATERIALIZE_QUERY]),
                [DQMTimingK.ANSWER_QUERY_FROM_SQS]: calcStdDevON(logs.map(x => x.dQMaterialization.timings[DQMTimingK.ANSWER_QUERY_FROM_SQS]), avgs.dQMaterialization.timings[DQMTimingK.ANSWER_QUERY_FROM_SQS]),
                [TotalTimingK.TOTAL]: calcStdDev(logs.map(x => x.dQMaterialization.timings[TotalTimingK.TOTAL]), avgs.dQMaterialization.timings[TotalTimingK.TOTAL]),
            },
            mViewSize: {
                queries: calcStdDevO(logs.map(x => x.dQMaterialization.mViewSize.queries), avgs.dQMaterialization.mViewSize.queries),
                answers: calcStdDevO(logs.map(x => x.dQMaterialization.mViewSize.answers), avgs.dQMaterialization.mViewSize.answers),
            }
        },
        dQMtoFQMViewSizePct: calcStdDevO(logs.map(x => x.dQMtoFQMViewSizePct), avgs.dQMtoFQMViewSizePct)
    }

    return {avgs, stdDevs}
}
