import hash from "object-hash";

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

export type Operation = Project | Union | Minus | Join | LeftJoin | Filter;
export type Operand = Operation | Bgp;
export type OpTypeMapping = {
    [K in types]: SingleType<Extract<Operation, { type: K }>>;
};

interface Unary extends BaseOperation {
    input: Operand;
}
export type UnaryOp = Extract<Operation, Unary>;

interface Binary extends BaseOperation {
    input: [Operand, Operand];
}
export type BinaryOp = Extract<Operation, Binary>;

interface Multi extends BaseOperation {
    input: ArrayMinLength<Operand, 2>;
}
export type BinaryOrMoreOp = Extract<Operation, Multi>;
export type TernaryOrMoreOp = Exclude<BinaryOrMoreOp, BinaryOp>;

export interface Project extends Unary {
    type: types.PROJECT;
    variables: Hashable[];
}

export interface Union extends Multi {
    type: types.UNION;
}

export interface Minus extends Binary {
    type: types.MINUS;
}

export interface Join extends Multi {
    type: types.JOIN;
}

export interface LeftJoin extends Binary {
    type: types.LEFT_JOIN;
    expression?: Hashable;
}

export interface Filter extends Unary {
    type: types.FILTER;
    expression: Hashable;
}

export interface Bgp extends BaseOperation {
    type: types.BGP;
    patterns: Hashable[];
}

//
// Type Guards
//
export function isOfOpType<U extends keyof OpTypeMapping>(op: Operation, opType: U): op is OpTypeMapping[U] {
    return op.type === opType;
}

export function isOneOfOpTypes<U extends keyof OpTypeMapping>(
    op: Operation,
    opTypes: readonly U[],
): op is OpTypeMapping[U] {
    return opTypes.includes(op.type);
}

export type Hashable = hash.NotUndefined;
