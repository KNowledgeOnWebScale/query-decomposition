import type { ArrayMinLength } from "../utils.js";

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace Algebra {
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

    export interface Single extends BaseOperation {
        input: Operation;
    }
    export interface Double extends BaseOperation {
        input: [Operation, Operation];
    }

    export interface Project extends Single {
        type: types.PROJECT;
        variables: Comparable<unknown>[];
    }

    export interface Union extends Double {
        type: types.UNION;
    }

    export interface Minus extends Double {
        type: types.MINUS;
    }

    export interface Join extends Double {
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
        patterns: ArrayMinLength<Comparable<unknown>, 1>;
    }
}

interface Comparable<T> {
    equals(other: T): boolean;
}
