import hash from "object-hash";

export function prettyPrintJSON(value: unknown) {
    console.debug(JSON.stringify(value, null, 2));
}

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

export function hashObj(v: hash.NotUndefined) {
    return hash(v, { respectType: false });
}

export function hashObjOrUndef(v: hash.NotUndefined | undefined) {
    return v !== undefined ? hashObj(v) : v;
}

export class SetC<T extends hash.NotUndefined> {
    private readonly set = new Set<string>();

    add(value: T) {
        this.set.add(hashObj(value));
    }

    has(value: T) {
        return this.set.has(hashObj(value));
    }
}
