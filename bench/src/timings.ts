import { type Entries } from "type-fest";

import { notNull } from "./utils.js";

import type { KeysOfUnion } from "./utils.js";

export enum TotalTimingK {
    TOTAL = "Total time taken to materialize and compute answer to query",
}

export enum FQMTimingK {
    TRANSLATE_TO_TREE = "Time taken to translate to query tree",
    CHECK_EXISTING_MATERIALIZED_VIEW = "Time taken to check if an existing materialized view can be used",
    COMPUTE_ANSWER_TO_QUERY = "Time taken to compute answer to query",
    MATERIALIZE_ANSWER_TO_QUERY = "Time taken to materialize answer to query",
}

export enum DQMTimingK {
    TRANSLATE_TO_TREE = "Time taken to translate to query tree",
    CHECK_EXISTING_MATERIALIZED_VIEW = "Time taken to check if an existing materialized view can be used",
    TRANSLATE_TO_REWRITE_TREE = "Time taken to translate to rewrite query tree",
    REWRITE_TREE = "Time taken to rewrite query tree",
    DECOMPOSE_TREE = "Time taken to decompose query tree",
    TRANSLATE_SQS_TO_REWRITE_TREES = "Total Time taken to translate to query strings from rewrite trees",
    TRANSLATE_SQS_TO_TREE = "Total time taken to translate subquery string to tree",
    CHECK_EXISTING_MATERIALIZED_SQ_VIEW = "Total time taken to check if an existing subquery materialized view can be used",
    ANSWER_SQS = "Total time taken to compute answer of subquery trees",
    MATERIALIZE_SQS = "Total time taken materialize answer to subquery trees",
    MATERIALIZE_AND_ANSWER_SQS = "Total time taken to compute and materialize answers to subqueries",
    MATERIALIZE_QUERY = "Time taken to materialize query",
    ANSWER_QUERY_FROM_SQS = "Time taken to compute answer to query from subquery answers",
}

export type FQMTimingsRaw = { [K in FQMTimingK]: { ms: number; isSummary: boolean } | null };
export type DQMTimingsRaw = { [K in DQMTimingK]: { ms: number; isSummary: boolean } | null };

export type FQMTimings = { [K in FQMTimingK]: { ms: number; pct: number } | null } & { [TotalTimingK.TOTAL]: number };
export type DQMTimings = { [K in DQMTimingK]: { ms: number; pct: number } | null } & { [TotalTimingK.TOTAL]: number };

export type TimingsRaw = FQMTimingsRaw | DQMTimingsRaw;
export type Timings = FQMTimings | DQMTimings;

export function createRawFQMTimings(): FQMTimingsRaw {
    return {
        [FQMTimingK.TRANSLATE_TO_TREE]: null,
        [FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]: null,
        [FQMTimingK.COMPUTE_ANSWER_TO_QUERY]: null,
        [FQMTimingK.MATERIALIZE_ANSWER_TO_QUERY]: null,
    };
}

export function createRawDQMTimings(): DQMTimingsRaw {
    return {
        [DQMTimingK.TRANSLATE_TO_TREE]: null,
        [DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW]: null,
        [DQMTimingK.TRANSLATE_TO_REWRITE_TREE]: null,
        [DQMTimingK.REWRITE_TREE]: null,
        [DQMTimingK.DECOMPOSE_TREE]: null,
        [DQMTimingK.TRANSLATE_SQS_TO_REWRITE_TREES]: null,
        [DQMTimingK.TRANSLATE_SQS_TO_TREE]: null,
        [DQMTimingK.CHECK_EXISTING_MATERIALIZED_SQ_VIEW]: null,
        [DQMTimingK.ANSWER_SQS]: null,
        [DQMTimingK.MATERIALIZE_SQS]: null,
        [DQMTimingK.MATERIALIZE_AND_ANSWER_SQS]: null,
        [DQMTimingK.MATERIALIZE_QUERY]: null,
        [DQMTimingK.ANSWER_QUERY_FROM_SQS]: null,
    };
}

export function addTimingA(
    timings: FQMTimingsRaw,
    key: KeysOfUnion<typeof timings>,
    start: number,
    isSummary = false,
): void {
    timings[key] = { ms: performance.now() - start, isSummary };
}

export function addTimingB(
    timings: DQMTimingsRaw,
    key: KeysOfUnion<typeof timings>,
    start: number,
    isSummary = false,
): void {
    timings[key] = { ms: performance.now() - start, isSummary };
}

export function computeTotalA(rawTiming: FQMTimingsRaw): FQMTimings {
    const total = Object.values(rawTiming)
        .filter(notNull)
        .filter(x => !x.isSummary)
        .map(x => x.ms)
        .reduce((acc, e) => acc + e, 0);
    const ret = Object.fromEntries(
        (Object.entries(rawTiming) as Entries<typeof rawTiming>).map(([k, v]) => [
            k,
            v !== null ? { ms: v.ms, pct: v.ms / total } : null,
        ]),
    ) as unknown as FQMTimings;
    ret[TotalTimingK.TOTAL] = total;

    return ret;
}

export function computeTotalB(rawTiming: DQMTimingsRaw): DQMTimings {
    const total = Object.values(rawTiming)
        .filter(notNull)
        .filter(x => !x.isSummary)
        .map(x => x.ms)
        .reduce((acc, e) => acc + e, 0);
    const ret = Object.fromEntries(
        (Object.entries(rawTiming) as Entries<typeof rawTiming>).map(([k, v]) => [
            k,
            v !== null ? { ms: v.ms, pct: v.ms / total } : null,
        ]),
    ) as unknown as DQMTimings;
    ret[TotalTimingK.TOTAL] = total;

    return ret;
}
