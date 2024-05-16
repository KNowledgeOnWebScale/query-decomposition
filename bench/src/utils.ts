import { hashObject } from "move-sparql-unions-to-top/src/utils.js";
import hash from "object-hash"
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type objectHash from "object-hash";
import type { StringDigit } from "type-fest/source/internal.js";
import assert from "node:assert/strict";

export type Path = string;

export const FILENAME = fileURLToPath(import.meta.url);
export const PROJECT_DIR = path.dirname(path.dirname(FILENAME));

export async function getContentsOfFilesInDir(
    dir: Path,
    filesFilter: (filePath: string) => boolean = () => true,
): Promise<(readonly [Path, string])[]> {
    try {
        const filenames = await fs.readdir(dir);
        return Promise.all(
            filenames
                .map(filename => path.join(dir, filename))
                .filter(filePath => filesFilter(filePath))
                .map(async filePath => {
                    try {
                        const content = await fs.readFile(filePath, "utf-8");
                        return [filePath, content] as const;
                    } catch (err) {
                        throw new Error(`Reading query file: ${new String(err).toString()}`);
                    }
                }),
        );
    } catch (err) {
        throw new Error(`Reading query directory: ${new String(err).toString()}`);
    }
}

export function roughSizeOf(a: unknown): number {
    // eslint-disable-next-line no-useless-escape
    const s = JSON.stringify(a).replace(/[\[\],"]/g, ""); //stringify and remove all "stringification" extra data

    return new Blob([s]).size; // size of utf-8 string in bytes
}

export type KeysOfUnion<T> = T extends T ? keyof T : never;
export type ValuesOfUnion<T> = T[KeysOfUnion<T>];
// https://stackoverflow.com/questions/49401866/all-possible-keys-of-an-union-type

export function notNull<T>(value: T | null): value is T {
    return value !== null;
}
// https://stackoverflow.com/questions/43118692/typescript-filter-out-nulls-from-an-array

export function sortOnHash<T extends objectHash.NotUndefined>(arr: T[]) {
    const hashed = arr.map((x, i) => {return {hash: hash(x, {unorderedObjects: true}), idx: i};});
    hashed.sort((a, b) => a.hash.localeCompare(b.hash));
    return hashed.map(x => arr[x.idx]!);
}

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