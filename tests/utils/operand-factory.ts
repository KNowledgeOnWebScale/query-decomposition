import { Factory } from "sparqlalgebrajs";

import { QueryTree } from "@src/query-tree/index.js";
import { _translate } from "@src/query-tree/translate.js";

import { inScopeVariables } from "./index.js";

import type { ArrayMinLength, Hashable } from "@src/utils.js";
import type { Algebra as ExternalAlgebra } from "sparqlalgebrajs";

export type CreateMultiOp<O extends QueryTree.OpThatTakesTwoOrMoreOperands> = (...operands: O["input"]) => O;

export class OperandFactory {
    private id = 0;
    factory = new Factory();

    constructor(private readonly prefixIri = "http://example.com/ns#") {}

    createBgp(patternCount = 1): QueryTree.Bgp {
        const patterns = new Array<ExternalAlgebra.Pattern>();
        for (let i = 0; i < patternCount; i += 1) {
            patterns.push(
                this.factory.createPattern(
                    this.factory.createTerm("?s"),
                    this.factory.createTerm(`${this.prefixIri}l${this.id}`),
                    this.factory.createTerm(`${this.prefixIri}o${this.id}`),
                ),
            );
            this.id += 1;
        }
        const bgp = this.factory.createBgp(patterns);
        return _translate(bgp) as QueryTree.Bgp;
    }

    createBgps<N extends number>(count: N): ArrayMinLength<QueryTree.Bgp, N> {
        const ret = new Array<QueryTree.Bgp>();
        for (let i = 0; i < count; i += 1) {
            ret.push(this.createBgp());
        }
        return ret as ArrayMinLength<QueryTree.Bgp, N>;
    }

    createBgpAndStr(): { v: QueryTree.Bgp; s: string } {
        const s = `?s <${this.prefixIri}l${this.id}> <${this.prefixIri}o${this.id}>`;
        const bgp = _translate(
            this.factory.createBgp([
                this.factory.createPattern(
                    this.factory.createTerm("?s"),
                    this.factory.createTerm(`${this.prefixIri}l${this.id}`),
                    this.factory.createTerm(`${this.prefixIri}o${this.id}`),
                ),
            ]),
        ) as QueryTree.Bgp;
        this.id += 1;
        return { v: bgp, s };
    }

    createBgpsAndStrs<N extends number>(count: N): ArrayMinLength<{ v: QueryTree.Bgp; s: string }, N> {
        const ret = new Array<{ v: QueryTree.Bgp; s: string }>();
        for (let i = 0; i < count; i += 1) {
            ret.push(this.createBgpAndStr());
        }
        return ret as ArrayMinLength<{ v: QueryTree.Bgp; s: string }, N>;
    }

    createExpression(term?: string): ExternalAlgebra.TermExpression {
        if (term === undefined) {
            // eslint-disable-next-line no-param-reassign
            term = `?f${this.id}`;
            this.id += 1;
        }
        return this.factory.createTermExpression(this.factory.createTerm(term));
    }

    static createFilter(input: QueryTree.Operand, expression: Hashable): QueryTree.Filter {
        return {
            type: QueryTree.types.FILTER,
            input,
            expression,
        };
    }

    static createJoin(...input: QueryTree.Join["input"]): QueryTree.Join {
        return {
            type: QueryTree.types.JOIN,
            input,
        };
    }

    static createLeftJoin(...input: QueryTree.LeftJoin["input"]): QueryTree.LeftJoin {
        return {
            type: QueryTree.types.LEFT_JOIN,
            input,
        };
    }

    static createUnion(...input: QueryTree.Union["input"]): QueryTree.Union {
        return {
            type: QueryTree.types.UNION,
            input,
        };
    }

    static createMinus(...input: QueryTree.Minus["input"]): QueryTree.Minus {
        return {
            type: QueryTree.types.MINUS,
            input,
        };
    }

    static createProject(input: QueryTree.Project["input"], variables?: Hashable[]): QueryTree.Project {
        return {
            type: QueryTree.types.PROJECT,
            input,
            variables: variables ?? inScopeVariables(input),
        };
    }
}
