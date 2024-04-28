import type { ArrayMinLength, Hashable, SingleType } from "../utils.js";

export type Operation = Project | Union | Minus | Join | LeftJoin | Filter;
export type Operand = Operation | Bgp;
export type OperandTypeMapping = {
    [K in Operand["type"]]: SingleType<Extract<Operand, { type: K }>>;
};

export interface Project extends Unary {
    type: types.PROJECT;
    variables: Hashable[];
}

export interface Union extends BinaryOrMore {
    type: types.UNION;
}

export interface Minus extends Binary {
    type: types.MINUS;
}

export interface Join extends BinaryOrMore {
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

export interface BaseOperation {
    type: types;
}

export enum types {
    PROJECT = "project",
    UNION = "union",
    MINUS = "minus",
    JOIN = "join",
    LEFT_JOIN = "left_join",
    FILTER = "filter",
    BGP = "bgp",
}

interface Unary extends BaseOperation {
    input: Operand;
}
export type UnaryOp = Extract<Operation, Unary>;

interface Binary extends BaseOperation {
    input: [Operand, Operand];
}
export type BinaryOp = Extract<Operation, Binary>;

interface BinaryOrMore extends BaseOperation {
    input: ArrayMinLength<Operand, 2>;
}
export type BinaryOrMoreOp = Extract<Operation, BinaryOrMore>;
export type TernaryOrMoreOp = Exclude<BinaryOrMoreOp, BinaryOp>;

//
// Type Guards
//
export function isOfType<T extends keyof OperandTypeMapping>(op: Operand, opType: T): op is OperandTypeMapping[T] {
    return op.type === opType;
}

export function isOneOfTypes<T extends keyof OperandTypeMapping>(
    op: Operand,
    opTypes: readonly T[],
): op is OperandTypeMapping[T] {
    return opTypes.includes(op.type);
}
