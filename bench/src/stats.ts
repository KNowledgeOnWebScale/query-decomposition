import assert from "node:assert/strict";

export function calcAvg(arr: number[]): number {
    if (arr.length === 0) {
        throw Error("calcAvg with empty array")
    }
    return arr.reduce((acc, e) => acc + e, 0) / arr.length;
}

export function calcStdDev(arr: number[], avg: number): number {
    if (arr.length === 0) {
        throw Error("calStdDev with empty array")
    }

    const squaredDeviations = arr.map(val => Math.pow(val - avg, 2));
    const variance = squaredDeviations.reduce((acc, val) => acc + val, 0) / (arr.length);

    return Math.sqrt(variance);
}

export function calcAvgO<T extends Record<string, number>>(arr: T[]): T {
    if (arr.length === 0) {
        throw Error("calcAvgO with empty array")
    }

    const start = Object.fromEntries(Object.entries(arr[0]!).map(([k, v]) => [k, 0]));

    const ret = arr.reduce((acc, e) => {
            for (const p of Object.keys(acc)) {
                if (e === null) {
                    continue;
                }
                acc[p]! += e[p]!;
            }
            return acc;
        }, start);

    for (const k of Object.keys(ret)) {
        if (ret[k] !== null) {
            ret[k]! /= arr.length
        }
    }

    return ret as T;
}

export function calcStdDevO<T extends Record<string, number>>(arr: T[], avgs: T): T {
    if (arr.length === 0) {
        throw Error("calStdDevO with empty array")
    }

    const start = Object.fromEntries(Object.entries(arr[0]!).map(([k, v]) => [k, 0]));

    // variance
    const ret = arr.reduce((acc, e) => {
            for (const p of Object.keys(acc)) {
                if (e === null) {
                    continue;
                }
                acc[p]! += Math.pow(e[p]! - avgs[p]!, 2);
            }
            return acc;
        }, start);

    for (const k of Object.keys(ret)) {
        if (ret[k] !== null) {
            ret[k]! /= arr.length
            ret[k]! = Math.sqrt(ret[k]!)
        }
    }

    return ret as T;
}

export function calcAvgON<T extends Record<string, number>>(arr: (T | null)[]): T | null {
    if (arr.includes(null)) {
        assert(arr.every(x => x === null));
        return null;
    }

    return calcAvgO<T>(arr as T[]);
}

export function calcStdDevON<T extends Record<string, number>>(arr: (T | null)[], avgs: T | null): T | null {
    if (arr.includes(null)) {
        assert(arr.every(x => x === null));
        return null;
    }

    return calcStdDevO<T>(arr as T[], avgs as T);
}