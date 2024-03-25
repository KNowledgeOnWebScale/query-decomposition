import type { ArrayMinLength, SingleType } from "../utils.js";

export enum types {
    PROJECT = "project",
    UNION = "union",
    MINUS = "minus",
    JOIN = "join",
    LEFT_JOIN = "left_join",
    FILTER = "filter",
    BGP = "bgp",
}

export interface BaseOperation {
    type: types;
}

export type Operation = Project | Union | Minus | Join | LeftJoin | Filter | Bgp;
export type OpTypeMapping = {
    [K in types]: SingleType<Extract<Operation, { type: K }>>;
};

export interface Single extends BaseOperation {
    input: Operation;
}
export interface Double extends BaseOperation {
    input: [Operation, Operation];
}
export interface Multi extends BaseOperation {
    input: ArrayMinLength<Operation, 2>;
}

export interface Project extends Single {
    type: types.PROJECT;
    variables: Comparable<unknown>[];
}

export interface Union extends Multi {
    type: types.UNION;
}

export interface Minus extends Double {
    type: types.MINUS;
}

export interface Join extends Multi {
    type: types.JOIN;
}

export interface LeftJoin extends Double {
    type: types.LEFT_JOIN;
    expression?: unknown;
}

export interface Filter extends Single {
    type: types.FILTER;
    expression: unknown;
}

export interface Bgp extends BaseOperation {
    type: types.BGP;
    patterns: Comparable<unknown>[];
}

//
// Type Guards
//
export function isOfOpType<U extends types>(op: Operation, opType: U): op is OpTypeMapping[U] {
    return op.type === opType;
}

export function hasSameOpTypeAs<T extends Operation>(x: Operation, y: T): x is T {
    return x.type === y.type;
}

interface Comparable<T> {
    equals(other: T): boolean;
}
