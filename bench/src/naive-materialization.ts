import {strict as assert} from "node:assert"
import { performance } from "node:perf_hooks";

import { Algebra, translate } from "sparqlalgebrajs";

import { executeQuery } from "./execute-query.js";
import { QueryResolver } from "./query-resolver.js";
import { areEquivalent } from "./query-tree/equivalence.js";
import { roughSizeOf } from "./utils.js";

import type { Bindings } from "@rdfjs/types";

export class NaiveQueryMaterialization extends QueryResolver {
    private readonly mViews: {query: Algebra.Project, answer: Awaited<ReturnType<typeof executeQuery>>}[] = []

    async _answerQuery(timings: {msg: string, value: number, isSummary: boolean}[], timeStop: (start: number, msg: string) => void, queryS: string): Promise<Bindings[]> {
        let start = performance.now();
        const query = translate(queryS);
        assert(query.type === Algebra.types.PROJECT);
        timeStop(start, "translate to query tree")

        start = performance.now();
        const mAnswer = this.mViews.find(({query: materializedQuery2}) => areEquivalent(materializedQuery2, query));
        timeStop(start, "check if an existing materialized view can be used")

        start = performance.now();
        const answer =  mAnswer !== undefined ? mAnswer.answer : await executeQuery(queryS);
        timeStop(start, "compute answer to query")
        start = performance.now();
        this.mViews.push({
            query,
            answer: answer,
        })
        timeStop(start, "materialize answer to query")

        return answer;
    }

    roughSizeOfMaterializedViews(): {queries: number, answers: number} {
        const ret = {queries: 0, answers: 0};

        const serializedQueries = new Set(this.mViews.map(x => x.query));
        for (const v of serializedQueries.values()) {
            ret.queries += roughSizeOf(v);
        }

        const serializedAnswers = new Set(this.mViews.map(x => x.answer));
        for (const v of serializedAnswers.values()) {
            ret.answers += roughSizeOf(v);
        }
        return ret;
    }
}


