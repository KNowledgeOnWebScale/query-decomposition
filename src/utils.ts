import hash from "object-hash";

type BuildArrayMinLength<T, N extends number, Current extends T[]> = Current["length"] extends N
    ? [...Current, ...T[]]
    : BuildArrayMinLength<T, N, [...Current, T]>;
export type ArrayMinLength<T, N extends number> = BuildArrayMinLength<T, N, []>;
// https://stackoverflow.com/questions/49910889/typescript-array-with-minimum-length

export function hasLengthAtLeast<T, L extends number>(arr: T[], length: L): arr is ArrayMinLength<T, L> {
    return arr.length >= length;
}

export type SingleType<T, U extends T = T> = T extends unknown ? ([U] extends [T] ? T : never) : T;
// https://stackoverflow.com/questions/53953814/typescript-check-if-a-type-is-a-union

export function hashObject(v: hash.NotUndefined): string {
    return hash(v, { respectType: false });
}

export function hashObjectOrUndefined(v: hash.NotUndefined | undefined): string | undefined {
    return v !== undefined ? hashObject(v) : v;
}

export class SetC<T extends hash.NotUndefined> {
    private readonly set = new Set<string>();

    add(value: T) {
        this.set.add(hashObject(value));
    }

    has(value: T) {
        return this.set.has(hashObject(value));
    }
}

export function areUnorderedEqual<T>(
    a: readonly T[],
    b: readonly T[],
    compareElementsCb: (x: T, y: T) => boolean,
): boolean {
    if (a.length !== b.length) {
        return false;
    }

    const b_ = b.slice();
    for (const x of a) {
        let found = false;

        for (const [idx, y] of b_.entries()) {
            if (compareElementsCb(x, y)) {
                found = true;
                b_.splice(idx, 1);
                break;
            }
        }

        if (!found) {
            return false;
        }
    }

    return true;
}

export function areOrderedEqual<T>(
    a: readonly T[],
    b: readonly T[],
    compareElementsCb: (x: T, y: T) => boolean,
): boolean {
    return a.length === b.length && a.every((x, idx) => compareElementsCb(x, b[idx]!));
}
