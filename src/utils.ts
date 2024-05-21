import * as RDF from "@rdfjs/types";
import hash from "object-hash";
import { Util as externalAlgebraUtil } from "sparqlalgebrajs";

import { QueryTree } from "@src/query-tree/index.js";

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

export type Hashable = hash.NotUndefined;

export function hashObject(v: hash.NotUndefined): string {
    return hash(v, { respectType: false });
}

export function hashObjectOrUndefined(v: hash.NotUndefined | undefined): string | undefined {
    return v !== undefined ? hashObject(v) : v;
}

export class SetC<T extends hash.NotUndefined> {
    private readonly set = new Set<string>();

    add(value: T): void {
        this.set.add(hashObject(value));
    }

    has(value: T): boolean {
        return this.set.has(hashObject(value));
    }
}

export function inScopeVariables(op: QueryTree.Operand): RDF.Variable[] {
    return externalAlgebraUtil.inScopeVariables(QueryTree.reverseTranslate(op));
}
