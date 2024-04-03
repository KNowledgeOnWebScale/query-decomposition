import { Factory, Util } from "sparqlalgebrajs";

import type { Hashable } from "../../src/query-tree/algebra.js";
import { Algebra } from "../../src/query-tree/index.js";
import { _translate, reverseTranslate } from "../../src/query-tree/translate.js";

export type CreateMultiOp<O extends Algebra.BinaryOrMoreOp> = (...operands: O["input"]) => O;

export class OperandFactory {
    private counter = 0;
    private readonly prefixIri = "http://example.com/ns#";
    factory = new Factory();

    createBgp(patterCount = 1): Algebra.Bgp {
        const patterns = [];
        for (let i = 0; i < patterCount; i += 1) {
            patterns.push(
                this.factory.createPattern(
                    this.factory.createTerm("?s"),
                    this.factory.createTerm(`${this.prefixIri}l${this.counter}`),
                    this.factory.createTerm(`${this.prefixIri}o${this.counter}`),
                ),
            );
            this.counter += 1;
        }
        const bgp = this.factory.createBgp(patterns);
        return _translate(bgp) as Algebra.Bgp;
    }

    createBgps(count: number) {
        const ret = [];
        for (let i = 0; i < count; i += 1) {
            ret.push(this.createBgp());
        }
        return ret;
    }

    createExpression(term_?: string) {
        const term = term_ ?? `?f${this.counter}`;
        this.counter += 1;
        return this.factory.createTermExpression(this.factory.createTerm(term));
    }

    static createFilter(input: Algebra.Operand, expression: Hashable): Algebra.Filter {
        return {
            type: Algebra.types.FILTER,
            input,
            expression,
        };
    }

    static createJoin(...input: Algebra.Join["input"]): Algebra.Join {
        return {
            type: Algebra.types.JOIN,
            input,
        };
    }

    static createLeftJoin(...input: Algebra.LeftJoin["input"]): Algebra.LeftJoin {
        return {
            type: Algebra.types.LEFT_JOIN,
            input,
        };
    }

    static createUnion(...input: Algebra.Union["input"]): Algebra.Union {
        return {
            type: Algebra.types.UNION,
            input,
        };
    }

    static createMinus(...input: Algebra.Minus["input"]): Algebra.Minus {
        return {
            type: Algebra.types.MINUS,
            input,
        };
    }

    static createProject(input: Algebra.Project["input"], variables?: Hashable[]): Algebra.Project {
        return {
            type: Algebra.types.PROJECT,
            input,
            variables: variables ?? Util.inScopeVariables(reverseTranslate(input)),
        };
    }
}
