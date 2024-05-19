import { type Entries } from "type-fest";

import { notNull, objectFromEntries } from "./utils.js";

import type { KeysOfUnion } from "./utils.js";

export enum TotalTimingK {
    TOTAL = "Total time taken to materialize and compute answer to query",
}

export enum FQMTimingK {
    TRANSLATE_TO_TREE = "Time taken to translate to query tree",
    CHECK_EXISTING_MATERIALIZED_VIEW = "Time taken to check if an existing materialized view can be used",
    MATERIALIZE_QUERY = "Time taken to materialize answer to query",
}

export enum DQMTimingK {
    TRANSLATE_TO_TREE = "Time taken to translate to query tree",
    CHECK_EXISTING_MATERIALIZED_VIEW = "Time taken to check if an existing materialized view can be used",
    TRANSLATE_TO_REWRITE_TREE = "Time taken to translate to rewrite query tree",
    REWRITE_TREE = "Time taken to rewrite query tree",
    TRANSLATE_FROM_REWRITE_TREE_TO_TREE = "Translate from rewrite tree to query string",
    DECOMPOSE_TREE = "Time taken to decompose query tree",
    CHECK_EXISTING_MATERIALIZED_SQ_VIEW = "Total time taken to check if an existing subquery materialized view can be used",
    MATERIALIZE_SQS = "Materialize subqueries",
    MATERIALIZE_QUERY = "Time taken to materialize query",
    ANSWER_QUERY_FROM_SQS = "Time taken to compute answer to query from subquery answers",
}

export type FQMTimingsRaw = { [K in FQMTimingK]: { ms: number } | null };
export type DQMTimingsRaw = { [K in DQMTimingK]: { ms: number } | null };

export type FQMTimings = { [K in FQMTimingK]: { ms: number; pct: number } | null } & { [TotalTimingK.TOTAL]: number };
export type DQMTimings = { [K in DQMTimingK]: { ms: number; pct: number } | null } & { [TotalTimingK.TOTAL]: number };

export type TimingsRaw = FQMTimingsRaw | DQMTimingsRaw;
export type Timings = FQMTimings | DQMTimings;

export function createRawFQMTimings(): FQMTimingsRaw {
    return objectFromEntries(Object.values(FQMTimingK).map(k => [k, null]));
}

export function createRawDQMTimings(): DQMTimingsRaw {
    return objectFromEntries(Object.values(DQMTimingK).map(k => [k, null]));
}

export function addTimingA(timings: FQMTimingsRaw, key: KeysOfUnion<typeof timings>, start: number): void {
    timings[key] = { ms: performance.now() - start };
}
export function addTimingB(timings: DQMTimingsRaw, key: KeysOfUnion<typeof timings>, start: number): void {
    timings[key] = { ms: performance.now() - start };
}

export function computeTotal(rawTiming: FQMTimingsRaw): FQMTimings;
export function computeTotal(rawTiming: DQMTimingsRaw): DQMTimings;
export function computeTotal(rawTiming: FQMTimingsRaw | DQMTimingsRaw): FQMTimings | DQMTimings {
    const total = Object.values(rawTiming)
        .filter(notNull)
        .map(x => x.ms)
        .reduce((acc, e) => acc + e, 0);
    const ret = objectFromEntries(
        (Object.entries(rawTiming) as Entries<typeof rawTiming>).map(([k, v]) => [
            k,
            v !== null ? { ms: v.ms, pct: v.ms / total } : null,
        ]),
    );

    return { ...ret, [TotalTimingK.TOTAL]: total };
}
